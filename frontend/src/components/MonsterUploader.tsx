// frontend/src/components/MonsterUploader.tsx

import React, { useState } from "react";
import MonsterCard from "./MonsterCard";
import type { LootType } from "./MonsterCard";

export default function MonsterUploader() {
  // Preview URL for the chosen file
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Monster metadata state
  const [monsterName, setMonsterName] = useState("New Monster");
  const [health, setHealth] = useState(50);
  const [maxHealth, setMaxHealth] = useState(100);
  const [loot, setLoot] = useState<LootType | null>(null);

  // Handle file selection and create an object URL for preview
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg space-y-6">
      {/* 1. File Input */}
      <div className="flex flex-col">
        <label className="font-semibold mb-1">Upload a Monster Image:</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="border rounded px-2 py-1"
        />
      </div>

      {/* 2. Metadata Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1">Name:</label>
          <input
            type="text"
            value={monsterName}
            onChange={(e) => setMonsterName(e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block mb-1">Health:</label>
          <input
            type="number"
            value={health}
            onChange={(e) => setHealth(Number(e.target.value))}
            className="w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block mb-1">Max Health:</label>
          <input
            type="number"
            value={maxHealth}
            onChange={(e) => setMaxHealth(Number(e.target.value))}
            className="w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block mb-1">Loot:</label>
          <select
            value={loot || ""}
            onChange={(e) => setLoot(e.target.value as LootType)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="">No Loot</option>
            <option value="Poison">Poison</option>
            <option value="Ice">Ice</option>
            <option value="Dual Sword">Dual Sword</option>
            <option value="Grenade">Grenade</option>
            <option value="Dynamite">Dynamite</option>
          </select>
        </div>
      </div>

      {/* 3. Preview the MonsterCard */}
      <div>
        {previewUrl ? (
          <MonsterCard
            position={1}
            name={monsterName.replace(/\s+/g, "_").toLowerCase()}
            imageUrl={previewUrl}
            health={health}
            maxHealth={maxHealth}
            loot={loot}
            cardWidth={150}
          />
        ) : (
          <p className="italic text-gray-500">No image uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
