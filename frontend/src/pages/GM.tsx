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
import Reserve from "../components/Reserve";
import VPRedistribute from "../components/VPRedistribute";

interface AllianceInfo {
  name: string;
  members: string[];
  vp_distribution: number[];
}

interface BattlefieldMonster {
  id: number;
  position: number;
  name: string;
  health: number;
  max_health: number;
  loot: string | null;
}

interface ReserveMonster {
  id: number;
  position: number;
  name: string;
  health: number;
  loot: string | null;
}

interface RawFullStatus {
  battlefield: BattlefieldMonster[];
  reserve: ReserveMonster[];
  turn_order: string[];
  round_started: boolean;
  alliances: AllianceInfo[];
  submitted_moves: string[];
  kill_history: { player: string | null; monster_id: number }[];
}

export default function GM() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [numPlayers, setNumPlayers] = useState<number>(4);
  const [numAlliances, setNumAlliances] = useState<number>(2);
  const [assignment, setAssignment] = useState<number[]>([]);
  const [err1, setErr1] = useState<string>("");
  const [err2, setErr2] = useState<string>("");

  const [status, setStatus] = useState<RawFullStatus | null>(null);
  const [over, setOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<string>("");
  const [roundResolved, setRoundResolved] = useState<boolean>(false);
  const [doneAlliances, setDoneAlliances] = useState<Set<string>>(new Set());
  const [kills, setKills] = useState<string[]>([]);

  // On mount: if a game is in progress, go to step 3
  useEffect(() => {
    (async () => {
      try {
        const s = await getStatus();
        setStatus(s);
        setStep(3);
      } catch {
        // no game yet
      }
    })();
  }, []);

  // Poll status every 2s
  useEffect(() => {
    if (step !== 3) return;
    const iv = setInterval(async () => {
      try {
        const s = await getStatus();
        setStatus(s);
      } catch {}
    }, 2000);
    return () => clearInterval(iv);
  }, [step]);

  // Poll game over
  useEffect(() => {
    if (step !== 3 || over) return;
    const iv = setInterval(async () => {
      if (!status) return;
      const go = await gameOver();
      if (go.over) {
        setOver(true);
        setWinner(go.winning_alliance);
      }
    }, 2000);
    return () => clearInterval(iv);
  }, [step, over, status]);

  // Reset game
  async function onReset(): Promise<void> {
    await resetGame();
    setStep(1);
    setStatus(null);
    setOver(false);
    setWinner("");
    setRoundResolved(false);
    setDoneAlliances(new Set());
    setKills([]);
  }

  // Step 1 → Step 2
  function next1(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setErr1("");
    if (numPlayers < 2) {
      setErr1("Need ≥2 players.");
      return;
    }
    if (numAlliances < 1 || numAlliances > numPlayers) {
      setErr1("Alliances must be between 1 and number of players.");
      return;
    }
    setAssignment(Array(numPlayers).fill(0));
    setStep(2);
  }

  // Step 2 → startGame
  async function next2(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErr2("");
    const counts = Array(numAlliances).fill(0);
    assignment.forEach((a) => counts[a]++);
    const empty = counts.findIndex((c) => c === 0);
    if (empty !== -1) {
      setErr2(`Alliance #${empty + 1} empty.`);
      return;
    }
    const playerNames = Array.from({ length: numPlayers }, (_, i) => `P${i + 1}`);
    const alliances: string[][] = Array.from({ length: numAlliances }, () => []);
    playerNames.forEach((name, idx) => {
      alliances[assignment[idx]].push(name);
    });

    await startGame(playerNames, alliances);
    setStep(3);
    const s = await getStatus();
    setStatus(s);
  }

  // VP redistribution
  async function onDist(alliance: AllianceInfo, vps: number[]): Promise<void> {
    await redistributeVP(alliance.name, vps);
    const s = await getStatus();
    setStatus(s);
  }
  function doneDist(name: string): void {
    setDoneAlliances((prev) => new Set(prev).add(name));
  }

  // Round handlers
  async function beginRound(): Promise<void> {
    await startRound();
    const s = await getStatus();
    setStatus(s);
    setRoundResolved(false);
    setKills([]);
  }
  async function finishRound(): Promise<void> {
    const res = await resolveRound();
    const texts = res.kill_announcements.map(
      (e: { player: string | null; slug: string }) =>
        e.player ? `${e.player} killed ${e.slug}` : `${e.slug} died from poison`
    );
    setKills(texts);
    setRoundResolved(true);
    const go = await gameOver();
    if (go.over) {
      setOver(true);
      setWinner(go.winning_alliance);
    }
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────

  // Step 1
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <form onSubmit={next1} className="bg-black bg-opacity-50 p-6 rounded text-white">
          <h2 className="mb-4 text-xl font-bold">Setup (1/2)</h2>
          <label className="block mb-2">
            Players:
            <input
              type="number"
              min={2}
              value={numPlayers}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNumPlayers(Number(e.currentTarget.value))
              }
              className="ml-2 w-16 text-black"
            />
          </label>
          <label className="block mb-2">
            Alliances:
            <input
              type="number"
              min={1}
              max={numPlayers}
              value={numAlliances}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNumAlliances(Number(e.currentTarget.value))
              }
              className="ml-2 w-16 text-black"
            />
          </label>
          {err1 && <p className="text-red-400">{err1}</p>}
          <button type="submit" className="mt-4 px-4 py-2 bg-blue-600 rounded">
            Next
          </button>
        </form>
      </div>
    );
  }

  // Step 2
  if (step === 2) {
    const allianceNames = Array.from({ length: numAlliances }, (_, i) => `Alliance ${i + 1}`);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <form onSubmit={next2} className="bg-black bg-opacity-50 p-6 rounded text-white">
          <h2 className="mb-4 text-xl font-bold">Setup (2/2)</h2>
          <table className="w-full mb-4 bg-gray-800 bg-opacity-60 rounded">
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
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const arr = [...assignment];
                        arr[i] = Number(e.currentTarget.value);
                        setAssignment(arr);
                      }}
                      className="w-full text-black"
                    >
                      {allianceNames.map((name, idx) => (
                        <option key={idx} value={idx}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {err2 && <p className="text-red-400">{err2}</p>}
          <button type="submit" className="px-4 py-2 bg-green-600 rounded">
            Start Game
          </button>
        </form>
      </div>
    );
  }

  // Step 3: GM console
  if (step === 3 && status) {
    // Game Over
    if (status.round_started && over) {
      return (
        <div className="min-h-screen flex items-center justify-center text-white">
          <div className="bg-black bg-opacity-50 p-6 rounded">
            <h2 className="text-xl font-bold mb-2">Game Over</h2>
            <p>
              Winner: <strong>{winner}</strong>
            </p>
            <button onClick={onReset} className="mt-4 px-4 py-2 bg-yellow-600 rounded">
              Reset Game
            </button>
          </div>
        </div>
      );
    }

    // Redistribute
    if (!status.round_started && !roundResolved) {
      const allDone = status.alliances.every((a) => doneAlliances.has(a.name));
      return (
        <div className="p-4 text-white">
          <h2 className="text-xl font-bold mb-4">Redistribute VP</h2>
          {status.alliances.map((a) => (
            <VPRedistribute
              key={a.name}
              alliance={a}
              onRedistribute={(v) => onDist(a, v)}
              onComplete={() => doneDist(a.name)}
            />
          ))}
          <button
            disabled={!allDone}
            onClick={beginRound}
            className={`px-4 py-2 rounded ${allDone ? "bg-blue-600" : "bg-gray-400"}`}
          >
            Start Round
          </button>
          <button onClick={onReset} className="ml-4 px-3 py-1 bg-yellow-600 rounded">
            Reset
          </button>
        </div>
      );
    }

    // Round In Progress
    if (status.round_started && !roundResolved) {
      const totalPlayers = status.alliances.reduce((sum, a) => sum + a.members.length, 0);
      const done = status.submitted_moves.length === totalPlayers;
      return (
        <div className="p-4 text-white">
          <h2 className="text-xl font-bold mb-4">Round In Progress</h2>
          <Battlefield monsters={status.battlefield} />
          <Reserve monsters={status.reserve} />
          <p className="mt-2">
            Submitted: {status.submitted_moves.length}/{totalPlayers}
          </p>
          <button
            disabled={!done}
            onClick={finishRound}
            className={`mt-2 px-4 py-2 rounded ${done ? "bg-red-600" : "bg-gray-400"}`}
          >
            Resolve Round
          </button>
          <button onClick={onReset} className="ml-4 mt-2 px-3 py-1 bg-yellow-600 rounded">
            Reset
          </button>
        </div>
      );
    }

    // Round Complete
    if (roundResolved) {
      return (
        <div className="p-4 text-white">
          <h2 className="text-xl font-bold mb-2">This Round’s Kills</h2>
          <ul className="list-disc list-inside mb-4">
            {kills.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
          <Battlefield monsters={status.battlefield} />
          <Reserve monsters={status.reserve} />

          {/* Trigger a new redistribution phase */}
          <button
            onClick={() => {
              setRoundResolved(false);
              setDoneAlliances(new Set());
            }}
            className="mt-2 px-4 py-2 rounded bg-purple-600"
          >
            Redistribute VP
          </button>

          <button onClick={onReset} className="ml-4 mt-2 px-3 py-1 bg-yellow-600 rounded">
            Reset
          </button>
        </div>
      );
    }
  }

  return null;
}
