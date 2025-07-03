// frontend/src/pages/GM.tsx

import React, { useEffect, useState } from "react";
import {
  startGame,
  getStatus,
  redistributeVP,
  startRound,
  resolveRound,
  gameOver,
  resetGame,
} from "../api/api";
import Battlefield from "../components/Battlefield";
import type { BattlefieldMonster } from "../components/Battlefield";
import Reserve from "../components/Reserve";
import VPRedistribute from "../components/VPRedistribute";
import type { LootType } from "../components/MonsterCard";

interface AllianceInfo {
  name: string;
  members: string[];
  vp_distribution: number[];
}

interface RawBattlefieldMonster {
  position: number;
  name: string;
  health: number;
  max_health?: number;
  loot: string | null;
}
interface RawReserveMonster {
  position: number;
  name: string;
  health: number;
  loot: string | null;
}
interface RawFullStatus {
  battlefield: RawBattlefieldMonster[];
  reserve: RawReserveMonster[];
  turn_order: string[];
  round_started: boolean;
  alliances: AllianceInfo[];
  submitted_moves: string[];
  kill_history: string[];
}

interface ReserveMonster {
  position: number;
  name: string;
  health: number;
  loot: LootType | null;
}

interface FullStatus {
  battlefield: BattlefieldMonster[];
  reserve: ReserveMonster[];
  turn_order: string[];
  round_started: boolean;
  alliances: AllianceInfo[];
  submitted_moves: string[];
  kill_history: string[];
}

function remapStatus(s: RawFullStatus): FullStatus {
  return {
    battlefield: s.battlefield.map((m) => ({
      position: m.position,
      name: m.name.trim().toLowerCase(),
      health: m.health,
      maxHealth: m.max_health ?? m.health,
      loot: m.loot as LootType | null,
    })),
    reserve: s.reserve.map((m) => ({
      position: m.position,
      name: m.name.trim().toLowerCase(),
      health: m.health,
      loot: m.loot as LootType | null,
    })),
    turn_order: s.turn_order,
    round_started: s.round_started,
    alliances: s.alliances,
    submitted_moves: s.submitted_moves,
    kill_history: s.kill_history,
  };
}

export default function GM() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [numPlayers, setNumPlayers] = useState(4);
  const [numAlliances, setNumAlliances] = useState(2);
  const [assignment, setAssignment] = useState<number[]>([]);
  const [err1, setErr1] = useState("");
  const [err2, setErr2] = useState("");

  const [status, setStatus] = useState<FullStatus | null>(null);
  const [over, setOver] = useState(false);
  const [winner, setWinner] = useState("");
  const [roundResolved, setRoundResolved] = useState(false);
  const [doneAlliances, setDoneAlliances] = useState<Set<string>>(new Set());
  const [kills, setKills] = useState<string[]>([]);

  // detect existing game
  useEffect(() => {
    (async () => {
      try {
        const raw = await getStatus();
        setStatus(remapStatus(raw));
        setStep(3);
      } catch {}
    })();
  }, []);

  // poll status
  useEffect(() => {
    if (step !== 3) return;
    const iv = setInterval(async () => {
      try {
        const raw = await getStatus();
        setStatus(remapStatus(raw));
      } catch {}
    }, 2000);
    return () => clearInterval(iv);
  }, [step]);

  // poll game over
  useEffect(() => {
    if (step !== 3 || over) return;
    const iv = setInterval(async () => {
      try {
        const go = await gameOver();
        if (go.over) {
          setOver(true);
          setWinner(go.winning_alliance);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(iv);
  }, [step, over]);

  async function onReset() {
    await resetGame();
    setStep(1);
    setStatus(null);
    setOver(false);
    setWinner("");
    setRoundResolved(false);
    setDoneAlliances(new Set());
    setKills([]);
  }

  function next1(e: React.FormEvent) {
    e.preventDefault();
    setErr1("");
    if (numPlayers < 2) return setErr1("Need at least 2 players.");
    if (numAlliances < 1 || numAlliances > numPlayers)
      return setErr1("Alliances must be between 1 and number of players.");
    setAssignment(Array(numPlayers).fill(0));
    setStep(2);
  }

  async function next2(e: React.FormEvent) {
    e.preventDefault();
    setErr2("");
    const counts = Array(numAlliances).fill(0);
    assignment.forEach((a) => counts[a]++);
    const empty = counts.findIndex((c) => c === 0);
    if (empty !== -1) return setErr2(`Alliance #${empty + 1} has no players.`);
    const names = Array.from({ length: numPlayers }, (_, i) => `P${i + 1}`);
    const lists: string[][] = Array.from({ length: numAlliances }, () => []);
    names.forEach((n, i) => lists[assignment[i]].push(n));
    await startGame(names, lists);
    setStep(3);
    const raw = await getStatus();
    setStatus(remapStatus(raw));
  }

  async function handleRedistribute(a: AllianceInfo, vps: number[]) {
    await redistributeVP(a.name, vps);
    const raw = await getStatus();
    setStatus(remapStatus(raw));
  }
  function handleDoneAlliance(name: string) {
    setDoneAlliances((prev) => new Set(prev).add(name));
  }

  async function handleStartRound() {
    await startRound();
    const raw = await getStatus();
    setStatus(remapStatus(raw));
    setRoundResolved(false);
    setKills([]);
    setDoneAlliances(new Set());
  }
  async function handleResolveRound() {
    const res = await resolveRound();
    setKills(res.kill_announcements);
    setRoundResolved(true);
  }

  // STEP 1
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <form onSubmit={next1} className="bg-black bg-opacity-60 p-6 rounded text-white space-y-4">
          <h2 className="text-2xl">Setup Game (1/2)</h2>
          <label className="block">
            Players:
            <input
              type="number"
              min={2}
              value={numPlayers}
              onChange={(e) => setNumPlayers(+e.target.value)}
              className="ml-2 w-16 text-black"
            />
          </label>
          <label className="block">
            Alliances:
            <input
              type="number"
              min={1}
              max={numPlayers}
              value={numAlliances}
              onChange={(e) => setNumAlliances(+e.target.value)}
              className="ml-2 w-16 text-black"
            />
          </label>
          {err1 && <p className="text-red-400">{err1}</p>}
          <button className="px-4 py-2 bg-blue-600 rounded">Next</button>
        </form>
      </div>
    );
  }

  // STEP 2
  if (step === 2) {
    const allianceNames = Array.from({ length: numAlliances }, (_, i) => `Alliance ${i + 1}`);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <form onSubmit={next2} className="bg-black bg-opacity-60 p-6 rounded text-white space-y-4">
          <h2 className="text-2xl">Setup Game (2/2)</h2>
          <table className="w-full bg-gray-800 bg-opacity-70 rounded">
            <thead>
              <tr>
                <th className="border px-2 py-1">Player</th>
                <th className="border px-2 py-1">Alliance</th>
              </tr>
            </thead>
            <tbody>
              {assignment.map((a, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">P{i + 1}</td>
                  <td className="border px-2 py-1">
                    <select
                      value={a}
                      onChange={(e) => {
                        const arr = [...assignment];
                        arr[i] = +e.target.value;
                        setAssignment(arr);
                      }}
                      className="w-full text-black"
                    >
                      {allianceNames.map((n, idx) => (
                        <option key={idx} value={idx}>
                          {n}
                        </option>
                      ))}
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {err2 && <p className="text-red-400">{err2}</p>}
          <button className="px-4 py-2 bg-green-600 rounded">Start Game</button>
        </form>
      </div>
    );
  }

  if (!status) return null;

  // ROUND IN PROGRESS
  if (status.round_started && !roundResolved) {
    const total = status.alliances.reduce((sum, a) => sum + a.members.length, 0);
    const allSubmitted = status.submitted_moves.length === total;

    return (
      <div className="min-h-screen bg-[url('/images/background.jpg')] bg-cover text-white">
        <div className="p-6 bg-black bg-opacity-50 space-y-6">
          <h1 className="text-3xl font-bold">GM Dashboard (Round In Progress)</h1>
          <Battlefield
            monsters={status.battlefield}
            turnOrder={status.turn_order}
          />
          <Reserve monsters={status.reserve} />
          <div>
            <h2 className="text-2xl font-semibold">Submissions</h2>
            <p>{status.submitted_moves.length}/{total} submitted</p>
          </div>
          <button
            disabled={!allSubmitted}
            onClick={handleResolveRound}
            className={`px-4 py-2 rounded ${allSubmitted ? "bg-red-600 hover:bg-red-700" : "bg-gray-400"}`}
          >
            Resolve Round
          </button>
        </div>
      </div>
    );
  }

  // ROUND COMPLETE
  if (roundResolved) {
    const allDone = status.alliances.every((a) => doneAlliances.has(a.name));
    return (
      <div className="p-6 bg-gray-900 text-white min-h-screen">
        <h2 className="text-2xl mb-4">This Round’s Kills</h2>
        <ul className="list-disc list-inside mb-6">
          {kills.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ul>
        <Battlefield
          monsters={status.battlefield}
          turnOrder={status.turn_order}
        />
        <Reserve monsters={status.reserve} />
        <button
          disabled={!allDone}
          onClick={handleStartRound}
          className={`px-4 py-2 rounded ${allDone ? "bg-blue-600" : "bg-gray-400"}`}
        >
          Next Round
        </button>
        <button onClick={onReset} className="ml-4 px-3 py-1 bg-yellow-600 rounded text-black">
          Reset
        </button>
      </div>
    );
  }

  return null;
}
