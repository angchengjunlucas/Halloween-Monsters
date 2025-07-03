// frontend/src/components/MonsterCard.tsx

import React from "react";

export type LootType = "Poison" | "Ice" | "Dual Sword" | "Grenade" | "Dynamite";

interface MonsterCardProps {
  position: number;
  name: string;
  imageUrl?: string; // e.g. "/images/monsters/zombie.png"
  health: number;
  maxHealth: number;
  loot: LootType | null;
}

export default function MonsterCard({
  position,
  name,
  imageUrl,
  health,
  maxHealth,
  loot,
}: MonsterCardProps) {
  const lootIcons: Record<LootType, string> = {
    Poison: "/icons/poison.svg",
    Ice: "/icons/ice.svg",
    "Dual Sword": "/icons/dual-sword.svg",
    Grenade: "/icons/grenade.svg",
    Dynamite: "/icons/dynamite.svg",
  };

  return (
    <div className="w-40 bg-white bg-opacity-90 border border-gray-300 rounded-lg shadow-lg overflow-hidden">
      {/* Position */}
      <div className="bg-gray-900 bg-opacity-75 text-white text-center py-1">
        <span className="text-sm font-semibold">#{position}</span>
      </div>

      {/* Image */}
      <div className="h-28 flex items-center justify-center bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full object-contain"
          />
        ) : (
          <span className="text-lg font-medium text-gray-700">{name}</span>
        )}
      </div>

      {/* Health */}
      <div className="flex items-center justify-center py-2 bg-white">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-red-500 mr-1"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4
               0 115.656 5.656L10 18.657l-6.828-6.829a4 4
               0 010-5.656z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm font-semibold text-gray-800">
          {health}/{maxHealth}
        </span>
      </div>

      {/* Loot */}
      <div className="h-10 flex items-center justify-center bg-gray-50">
        {loot ? (
          <img
            src={lootIcons[loot]}
            alt={loot}
            className="h-6 w-6"
          />
        ) : (
          <span className="text-gray-400 text-sm">No Loot</span>
        )}
      </div>
    </div>
  );
}
