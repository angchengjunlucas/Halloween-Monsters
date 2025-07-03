// frontend/src/components/VPRedistribute.tsx
import React, { useEffect, useState } from "react";

interface VPRedistributeProps {
  alliance: {
    name: string;
    members: string[];
    vp_distribution: number[];
  };
  onRedistribute: (newVPs: number[]) => Promise<void>;
  onComplete: () => void; // NEW: notify parent that this alliance is done
}

export default function VPRedistribute({
  alliance,
  onRedistribute,
  onComplete,
}: VPRedistributeProps) {
  const { name, members, vp_distribution } = alliance;

  // Local state to hold the new VP values that the user types in:
  const [newVPs, setNewVPs] = useState<number[]>([...vp_distribution]);

  // Whether the "Confirm" button should be enabled:
  const [valid, setValid] = useState(false);

  // Once submitted successfully, we mark done = true, which turns the box green
  const [done, setDone] = useState(false);

  // Compute total old VP for validation:
  const totalOld = vp_distribution.reduce((sum, v) => sum + v, 0);

  // Re‐validate whenever newVPs changes
  useEffect(() => {
    const allAtLeastOne = newVPs.every((v) => v >= 1);
    const sumMatches = newVPs.reduce((s, v) => s + v, 0) === totalOld;
    setValid(allAtLeastOne && sumMatches);
  }, [newVPs, totalOld]);

  // Handle user edits
  function handleChange(idx: number, value: string) {
    const parsed = parseInt(value, 10);
    const next = isNaN(parsed) ? 0 : parsed;
    setNewVPs((prev) => {
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  }

  // Handle “Confirm” click
  async function handleConfirm() {
    if (!valid) return;
    try {
      await onRedistribute(newVPs);
      setDone(true);
      onComplete();  // ← Notify GM that this alliance is finished
    } catch {
      alert("Redistribution failed on the server. Check your inputs.");
    }
  }

  return (
    <div
      className={`border rounded p-4 ${
        done ? "bg-green-100 border-green-500" : "bg-white border-gray-300"
      }`}
    >
      <h3 className="text-xl font-semibold mb-2">
        {name} (Total VP: {totalOld})
      </h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {members.map((player, idx) => (
          <div key={player} className="flex items-center space-x-2">
            <label className="w-20">{player}:</label>
            <input
              type="number"
              min={1}
              value={newVPs[idx]}
              onChange={(e) => handleChange(idx, e.target.value)}
              className="w-16 border px-1 py-0.5"
              disabled={done}
            />
          </div>
        ))}
      </div>

      <div>
        <button
          onClick={handleConfirm}
          disabled={!valid || done}
          className={`px-4 py-2 rounded text-white ${
            done
              ? "bg-green-500 cursor-default"
              : valid
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {done ? "Confirmed" : "Confirm"}
        </button>
        {!valid && !done && (
          <p className="mt-2 text-sm text-red-600">
            Each player must have ≥ 1 VP and total must equal {totalOld}.
          </p>
        )}
      </div>
    </div>
  );
}
