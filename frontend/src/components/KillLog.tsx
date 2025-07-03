// frontend/src/components/KillLog.tsx
import React from "react";

interface Props {
  kills: string[];
}

export default function KillLog({ kills }: Props) {
  return (
    <div className="my-4">
      <h2 className="text-2xl font-semibold mb-2">Kill Log</h2>
      {kills.length > 0 ? (
        <ul className="list-disc pl-5 space-y-1">
          {kills.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ul>
      ) : (
        <p>No kills this round.</p>
      )}
    </div>
  );
}
