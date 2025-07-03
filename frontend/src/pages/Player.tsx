// frontend/src/pages/Player.tsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getStatus,
  getPlayerWeapons,
  submitMove,
} from "../api/api";
import Battlefield from "../components/Battlefield";

interface BattlefieldMonster {
  position: number;
  name: string;         // slug
  health: number;
  max_health: number;
  loot: string | null;
}

interface StatusShape {
  battlefield: BattlefieldMonster[];
  turn_order: string[];
  round_started: boolean;
  submitted_moves: string[];
}

export default function Player() {
  const { playerName } = useParams<{ playerName: string }>();
  const [status, setStatus] = useState<StatusShape | null>(null);
  const [weapons, setWeapons] = useState<[string, number][]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);

  const [selectedWeaponIdx, setSelectedWeaponIdx] = useState(0);
  const [targetPos, setTargetPos] = useState<number>(1);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const s: StatusShape = await getStatus();
        setStatus(s);

        try {
          const w = await getPlayerWeapons(playerName!);
          setWeapons(w);
        } catch {
          console.error("Failed to fetch weapons for", playerName);
        }

        if (!s.round_started) {
          setHasSubmitted(false);
          setIsMyTurn(false);
          return;
        }

        const submitted = s.submitted_moves.includes(playerName!);
        setHasSubmitted(submitted);

        const nextPlayer = s.turn_order.find(
          (n) => !s.submitted_moves.includes(n)
        );
        setIsMyTurn(nextPlayer === playerName!);
      } catch {
        // ignore
      }
    }, 500);
    return () => clearInterval(interval);
  }, [playerName]);

  if (!status) {
    return <p className="p-4">Waiting for game to start…</p>;
  }

  const { battlefield, turn_order, round_started } = status;

  if (!round_started) {
    return (
      <div className="p-4">
        <h2 className="text-2xl mb-2">Hello {playerName},</h2>
        <p>Waiting for round to start…</p>
      </div>
    );
  }

  if (hasSubmitted) {
    return <p className="p-4">You have submitted your move. Please wait…</p>;
  }

  if (!isMyTurn) {
    return (
      <div className="p-4">
        <h2 className="text-2xl mb-2">Hello {playerName},</h2>
        <p>Waiting for your turn…</p>
        <p className="italic">Current order: {turn_order.join(" → ")}</p>
        <Battlefield monsters={battlefield} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-semibold">Your Turn, {playerName}</h2>
      <Battlefield monsters={battlefield} />

      <div className="space-y-2">
        <p>Select a weapon and a monster to attack:</p>

        {weapons.length === 0 && <p>Loading your weapons…</p>}

        {weapons.length === 1 ? (
          <p>
            Only weapon: <strong>{weapons[0][0]}</strong> (ATK={weapons[0][1]})
          </p>
        ) : (
          <ul className="space-y-1">
            {weapons.map(([wname, atk], idx) => (
              <li key={idx}>
                <label>
                  <input
                    type="radio"
                    name="weaponRadio"
                    value={idx}
                    checked={idx === selectedWeaponIdx}
                    onChange={() => setSelectedWeaponIdx(idx)}
                  />{" "}
                  {wname} (ATK={atk})
                </label>
              </li>
            ))}
          </ul>
        )}

        <div>
          <label className="mr-2">Monster position:</label>
          <select
            className="border px-2 py-1"
            value={targetPos}
            onChange={(e) => setTargetPos(Number(e.target.value))}
          >
            {battlefield.map((m) => (
              <option key={m.position} value={m.position}>
                {m.position}
              </option>
            ))}
          </select>
        </div>

        <button
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded"
          onClick={async () => {
            const chosenWeaponName = weapons[selectedWeaponIdx][0];
            await submitMove(playerName!, targetPos, chosenWeaponName);
            setHasSubmitted(true);
          }}
        >
          Submit Attack
        </button>
      </div>
    </div>
  );
}
