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

interface RawFullStatus {
  battlefield: any[];
  reserve: any[];
  turn_order: string[];
  round_started: boolean;
  alliances: AllianceInfo[];
  submitted_moves: string[];
  kill_history: string[];
}

export default function GM() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [numPlayers, setNumPlayers] = useState(4);
  const [numAlliances, setNumAlliances] = useState(2);
  const [assignment, setAssignment] = useState<number[]>([]);
  const [err1, setErr1] = useState("");
  const [err2, setErr2] = useState("");

  const [status, setStatus] = useState<RawFullStatus | null>(null);
  const [over, setOver] = useState(false);
  const [winner, setWinner] = useState("");
  const [roundResolved, setRoundResolved] = useState(false);
  const [doneAlliances, setDoneAlliances] = useState<Set<string>>(new Set());
  const [kills, setKills] = useState<string[]>([]);

  // On mount: only jump to step3 if status() truly succeeds
  useEffect(() => {
    (async () => {
      try {
        const s = await getStatus();
        setStatus(s);
        setStep(3);
      } catch {
        // stay at step 1
      }
    })();
  }, []);

  // Poll status
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

  // Reset everything
  async function onReset() {
    await resetGame();
    setStep(1);
    setStatus(null);
    setOver(false);
    setWinner("");
    setRoundResolved(false);
    setDoneAlliances(new Set());
  }

  // Step1 → Step2
  function next1(e: React.FormEvent) {
    e.preventDefault();
    setErr1("");
    if (numPlayers < 2) return setErr1("Need ≥2 players.");
    if (numAlliances < 1 || numAlliances > numPlayers)
      return setErr1("Alliances 1–players.");
    setAssignment(Array(numPlayers).fill(0));
    setStep(2);
  }

  // Step2 → startGame
  async function next2(e: React.FormEvent) {
    e.preventDefault();
    setErr2("");
    const counts = Array(numAlliances).fill(0);
    assignment.forEach((a) => counts[a]++);
    const empty = counts.findIndex((c) => c === 0);
    if (empty !== -1) return setErr2(`Alliance #${empty + 1} empty.`);
    const names = Array.from({ length: numPlayers }, (_, i) => `P${i + 1}`);
    const lists: string[][] = Array.from({ length: numAlliances }, () => []);
    names.forEach((n, i) => lists[assignment[i]].push(n));
    await startGame(names, lists);
    setStep(3);
    const s = await getStatus();
    setStatus(s);
  }

  // VP redistribute
  async function onDist(a: AllianceInfo, vps: number[]) {
    await redistributeVP(a.name, vps);
    const s = await getStatus();
    setStatus(s);
  }
  function doneDist(name: string) {
    setDoneAlliances((prev) => new Set(prev).add(name));
  }

  // Round handlers
  async function beginRound() {
    await startRound();
    const s = await getStatus();
    setStatus(s);
    setRoundResolved(false);
    setKills([]);
  }
  async function finishRound() {
    const res = await resolveRound();
    setKills(res.kill_announcements);
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
              onChange={(e) => setNumPlayers(+e.target.value)}
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
              onChange={(e) => setNumAlliances(+e.target.value)}
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
    const names = Array.from({ length: numAlliances }, (_, i) => `Alliance ${i + 1}`);
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
                      onChange={(e) => {
                        const arr = [...assignment];
                        arr[i] = +e.target.value;
                        setAssignment(arr);
                      }}
                      className="w-full text-black"
                    >
                      {names.map((n, idx) => (
                        <option key={idx} value={idx}>
                          {n}
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

  // Step 3: status guaranteed non-null now
  if (step === 3 && status) {
    // Game Over
    if (status.round_started && over) {
      return (
        <div className="min-h-screen flex items-center justify-center text-white">
          <div className="bg-black bg-opacity-50 p-6 rounded">
            <h2 className="text-xl font-bold mb-2">Game Over</h2>
            <p>Winner: <strong>{winner}</strong></p>
            <button
              onClick={onReset}
              className="mt-4 px-4 py-2 bg-yellow-600 rounded"
            >
              Reset Game
            </button>
          </div>
        </div>
      );
    }

    // Before first round: redistribute
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
          <button
            onClick={onReset}
            className="ml-4 px-3 py-1 bg-yellow-600 rounded"
          >
            Reset
          </button>
        </div>
      );
    }

    // Round in progress
    if (status.round_started && !roundResolved) {
      const total = status.alliances.reduce((s, a) => s + a.members.length, 0);
      const done = status.submitted_moves.length === total;
      const free = status.reserve.filter(
        (r) => !status.battlefield.find((b) => b.position === r.position)
      );
      return (
        <div className="p-4 text-white">
          <h2 className="text-xl font-bold mb-4">Round In Progress</h2>
          <Battlefield monsters={status.battlefield} />
          <Reserve monsters={free} />
          <p>Submitted: {status.submitted_moves.length}/{total}</p>
          <button
            disabled={!done}
            onClick={finishRound}
            className={`px-4 py-2 rounded ${done ? "bg-red-600" : "bg-gray-400"}`}
          >
            Resolve Round
          </button>
          <button
            onClick={onReset}
            className="ml-4 px-3 py-1 bg-yellow-600 rounded"
          >
            Reset
          </button>
        </div>
      );
    }

    // Round complete: show kills + next round
    if (roundResolved) {
      const allDone = status.alliances.every((a) => doneAlliances.has(a.name));
      const free = status.reserve.filter(
        (r) => !status.battlefield.find((b) => b.position === r.position)
      );
      return (
        <div className="p-4 text-white">
          <h2 className="text-xl font-bold mb-2">This Round’s Kills</h2>
          <ul className="list-disc list-inside mb-4">
            {kills.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
          <Battlefield monsters={status.battlefield} />
          <Reserve monsters={free} />
          <button
            disabled={!allDone}
            onClick={beginRound}
            className={`px-4 py-2 rounded ${allDone ? "bg-blue-600" : "bg-gray-400"}`}
          >
            Next Round
          </button>
          <button
            onClick={onReset}
            className="ml-4 px-3 py-1 bg-yellow-600 rounded"
          >
            Reset
          </button>
        </div>
      );
    }
  }

  // fallback
  return null;
}
