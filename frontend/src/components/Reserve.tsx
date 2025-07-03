import React, { useState } from "react";
import MonsterCard from "./MonsterCard";
import type { LootType } from "./MonsterCard";

export interface ReserveMonster {
  position: number;
  name: string;       // slug, e.g. "zombie", "icequeen", etc.
  health: number;
  loot: string | null;
}

interface ReserveProps {
  monsters: ReserveMonster[];
}

export default function Reserve({ monsters }: ReserveProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleMonsters = showAll ? monsters : monsters.slice(0, 5);

  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold text-white px-4">Reserve Monsters</h2>
      <div className="overflow-x-auto py-2">
        <div className="flex gap-12 px-4">
          {visibleMonsters.map((m) => {
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

      {monsters.length > 5 && (
        <div className="px-4">
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="mt-4 px-3 py-1 bg-blue-600 text-white rounded"
          >
            {showAll ? "Show Less" : `Show All (${monsters.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
