// src/components/MonsterRow.tsx

import React from "react";
import MonsterCard from "./MonsterCard";
import type { LootType } from "./MonsterCard";

export interface MonsterData {
  position: number;
  name: string;
  health: number;
  maxHealth: number;
  loot: LootType | null;
  imageUrl: string;
}

interface MonsterRowProps {
  monsters: MonsterData[];
}

export default function MonsterRow({ monsters }: MonsterRowProps) {
  return (
    <div className="overflow-x-auto py-4">
      <div className="inline-flex space-x-4 px-4">
        {monsters.map((m) => (
          <MonsterCard
            key={m.position}
            position={m.position}
            name={m.name}
            imageUrl={m.imageUrl}
            health={m.health}
            maxHealth={m.maxHealth}
            loot={m.loot}
          />
        ))}
      </div>
    </div>
  );
}
