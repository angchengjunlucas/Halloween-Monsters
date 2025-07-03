import React from "react";

export type LootType = "Poison" | "Ice" | "Dual Sword" | "Grenade" | "Dynamite";

interface MonsterCardProps {
  position: number;
  name: string;       // slug, e.g. "zombie", "icequeen", etc.
  imageUrl?: string;  // e.g. "/images/monsters/zombie.png"
  health: number;     // current HP
  maxHealth: number;  // maximum HP
  loot: LootType | null;
  cardWidth?: number; // in pixels (defaults to 150)
}

export default function MonsterCard({
  position,
  name,
  imageUrl,
  health,
  maxHealth,
  loot,
  cardWidth = 150,
}: MonsterCardProps) {
  // Compute sizes based on cardWidth (2:3 aspect for portrait)
  const portraitHeightPx = Math.round(cardWidth * 1.5);
  const headerBarPx = Math.round(cardWidth * 0.20);
  const healthBarPx = Math.round(cardWidth * 0.15);
  const heartIconPx = Math.round(cardWidth * 0.30);
  const lootIconPx = Math.round(cardWidth * 0.30);
  const textSizePx = Math.max(12, Math.round(cardWidth * 0.10));

  // Display name with capitalization
  const displayName = name
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const lootIcons: Record<LootType, string> = {
    Poison: "/icons/poison.png",
    Ice: "/icons/ice.png",
    "Dual Sword": "/icons/dual-sword.png",
    Grenade: "/icons/grenade.png",
    Dynamite: "/icons/dynamite.png",
  };

  return (
    <div
      style={{ width: `${cardWidth}px` }}
      className="bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden flex flex-col"
    >
      {/* Header: monster name + position */}
      <div
        style={{ height: `${headerBarPx}px` }}
        className="bg-gray-900 bg-opacity-75 text-white flex flex-col items-center justify-center px-2"
      >
        <span
          style={{ fontSize: `${textSizePx}px`, lineHeight: 1 }}
          className="font-semibold capitalize"
        >
          {displayName}
        </span>
        <span
          style={{ fontSize: `${Math.round(textSizePx * 0.9)}px`, lineHeight: 1 }}
          className="text-gray-200"
        >
          #{position}
        </span>
      </div>

      {/* Portrait */}
      <div
        style={{ height: `${portraitHeightPx}px` }}
        className="flex items-center justify-center bg-gray-100"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            style={{
              maxWidth: `${cardWidth * 0.85}px`,
              maxHeight: `${portraitHeightPx * 0.85}px`,
            }}
            className="object-contain"
          />
        ) : (
          <span
            style={{ fontSize: `${textSizePx}px` }}
            className="text-gray-700"
          >
            {displayName}
          </span>
        )}
      </div>

      {/* Health & Loot */}
      <div className="bg-white flex flex-col items-center justify-center">
        {/* Health bar */}
        <div
          style={{
            height: `${healthBarPx}px`,
            padding: `${Math.round(cardWidth * 0.02)}px`,
          }}
          className="flex items-center justify-center"
        >
          <img
            src="/icons/heart.png"
            alt="HP"
            style={{
              width: `${heartIconPx}px`,
              height: `${heartIconPx}px`,
            }}
            className="object-contain mr-2"
          />
          <span
            style={{ fontSize: `${textSizePx}px` }}
            className="font-semibold text-gray-800"
          >
            {health} / {maxHealth}
          </span>
        </div>

        {/* Loot icon */}
        <div className="mt-2 mb-3 flex items-center justify-center">
          {loot ? (
            <img
              src={lootIcons[loot]}
              alt={loot}
              style={{
                width: `${lootIconPx}px`,
                height: `${lootIconPx}px`,
              }}
              className="object-contain"
            />
          ) : (
            <span
              style={{ fontSize: `${Math.round(textSizePx * 0.9)}px` }}
              className="text-gray-400"
            >
              No Loot
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
