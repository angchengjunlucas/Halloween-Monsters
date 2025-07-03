import React from "react";
import MonsterCard from "./MonsterCard";
import type { LootType } from "./MonsterCard";

export interface BattlefieldMonster {
  position: number;
  name: string;       // slug, e.g. "zombie", "icequeen", etc.
  health: number;
  loot: string | null;
}

interface BattlefieldProps {
  monsters: BattlefieldMonster[];
}

export default function Battlefield({ monsters }: BattlefieldProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-white px-4">
        Battlefield Monsters
      </h2>
      <div className="overflow-x-auto py-2">
        {/* flex with gap-12 (~3rem = 48px) between cards */}
        <div className="flex gap-12 px-4">
          {monsters.map((m) => {
            const slug = m.name.trim().toLowerCase();
            const imageUrl = `/images/monsters/${slug}.png`;
            return (
              <div key={m.position} className="flex-shrink-0">
                <MonsterCard
                  position={m.position}
                  name={slug}
                  imageUrl={imageUrl}
                  health={m.health}
                  maxHealth={m.health}
                  loot={(m.loot as LootType) || null}
                  cardWidth={150}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
