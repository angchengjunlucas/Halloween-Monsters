// frontend/src/components/Battlefield.tsx

import React from "react";
import MonsterCard from "./MonsterCard";
import type { LootType } from "./MonsterCard";

export interface BattlefieldMonster {
  position: number;
  name: string;         // slug, e.g. "zombie", "icequeen"
  health: number;
  maxHealth: number;
  loot: LootType | null;
}

interface BattlefieldProps {
  monsters: BattlefieldMonster[];
  turnOrder?: string[];
}

export default function Battlefield({
  monsters,
  turnOrder,
}: BattlefieldProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-white px-4">
        Battlefield Monsters
      </h2>

      {turnOrder && (
        <div className="px-4 text-white">
          <strong>Turn Order:</strong> {turnOrder.join(" → ")}
        </div>
      )}

      <div className="overflow-x-auto py-2">
        <div className="flex gap-12 px-4">
          {monsters.map((m) => (
            <div key={m.position} className="flex-shrink-0">
              <MonsterCard
                position={m.position}
                name={m.name}
                imageUrl={`/images/monsters/${m.name}.png`}
                health={m.health}
                maxHealth={m.maxHealth}
                loot={m.loot}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
