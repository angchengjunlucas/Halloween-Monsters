// frontend/src/pages/Player.tsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getStatus, getPlayerWeapons, submitMove } from "../api/api";
import Battlefield from "../components/Battlefield";
import type { BattlefieldMonster } from "../components/Battlefield";
import type { LootType } from "../components/MonsterCard";

interface RawBattlefieldMonster {
  position: number;
  name: string;
  health: number;
  max_health?: number;
  loot: string | null;
}

interface StatusShape {
  battlefield: RawBattlefieldMonster[];
  turn_order: string[];
  round_started: boolean;
  submitted_moves: string[];
}

const WEAPON_ICONS: Record<string,string> = {
  Poison: "/icons/poison.svg",
  Ice: "/icons/ice.svg",
  "Dual Sword": "/icons/dual-sword.svg",
  Grenade: "/icons/grenade.svg",
  Dynamite: "/icons/dynamite.svg",
};

export default function Player() {
  const { playerName } = useParams<{ playerName: string }>();
  const [status, setStatus] = useState<StatusShape | null>(null);
  const [weapons, setWeapons] = useState<[string, number][]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [selectedWeaponIdx, setSelectedWeaponIdx] = useState(0);
  const [targetPos, setTargetPos] = useState(1);

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const s = (await getStatus()) as StatusShape;
        setStatus(s);
        setWeapons(await getPlayerWeapons(playerName!));
        if (s.round_started) {
          const done = s.submitted_moves.includes(playerName!);
          setHasSubmitted(done);
          const next = s.turn_order.find((n) => !s.submitted_moves.includes(n));
          setIsMyTurn(next === playerName);
          if (s.battlefield.length && !done) {
            setTargetPos(s.battlefield[0].position);
          }
        }
      } catch {}
    }, 500);
    return () => clearInterval(iv);
  }, [playerName]);

  if (!status) return <p className="p-4">Waiting for game to start…</p>;
  if (!status.round_started) return <p className="p-4">Waiting for round to start…</p>;
  if (hasSubmitted) return <p className="p-4">You have submitted your move. Please wait…</p>;

  const battlefieldData: BattlefieldMonster[] = status.battlefield.map((m) => ({
    position: m.position,
    name: m.name.trim().toLowerCase(),
    health: m.health,
    maxHealth: m.max_health ?? m.health,
    loot: m.loot as LootType | null,
  }));

  if (!isMyTurn) {
    return (
      <div className="p-4">
        <h2 className="text-2xl mb-2">Hello {playerName},</h2>
        <p>Waiting for your turn…</p>
        <p className="italic">Order: {status.turn_order.join(" → ")}</p>
        <Battlefield monsters={battlefieldData} turnOrder={status.turn_order} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-semibold">Your Turn, {playerName}</h2>

      <Battlefield monsters={battlefieldData} turnOrder={status.turn_order} />

      <div className="space-y-2">
        <p>Select a weapon and a monster to attack:</p>

        {weapons.map(([wname, atk], idx) => (
          <label key={idx} className="block">
            <input
              type="radio"
              name="weapon"
              value={idx}
              checked={idx === selectedWeaponIdx}
              onChange={() => setSelectedWeaponIdx(idx)}
            />{" "}
            <img src={WEAPON_ICONS[wname]} alt={wname} className="inline h-5 w-5 mr-1" />
            {wname} (ATK={atk})
          </label>
        ))}

        <div>
          <label className="mr-2">Target:</label>
          <select
            className="border px-2 py-1"
            value={targetPos}
            onChange={(e) => setTargetPos(+e.target.value)}
          >
            {battlefieldData.map((m) => (
              <option key={m.position} value={m.position}>
                #{m.position}
              </option>
            ))}
          </select>
        </div>

        <button
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded"
          onClick={async () => {
            const weaponName = weapons[selectedWeaponIdx][0];
            await submitMove(playerName!, targetPos, weaponName);
            setHasSubmitted(true);
          }}
        >
          Submit Attack
        </button>
      </div>
    </div>
  );
}
