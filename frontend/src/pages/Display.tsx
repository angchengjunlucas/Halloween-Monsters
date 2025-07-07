import React, { useEffect, useState } from "react";
import { getStatus } from "../api/api";
import Battlefield from "../components/Battlefield";
import Reserve from "../components/Reserve";
import KillLog from "../components/KillLog";
import TurnOrder from "../components/TurnOrder";

interface BattlefieldMonster {
  position: number;
  name: string;
  health: number;
  max_health: number;
  loot: string | null;
}
interface ReserveMonster {
  position: number;
  name: string;
  health: number;
  loot: string | null;
}
interface StatusShape {
  battlefield: BattlefieldMonster[];
  reserve: ReserveMonster[];
  turn_order: string[];
  round_started: boolean;
  kill_history: string[]; // or { player, slug } if you use objects
}

export default function Display() {
  const [status, setStatus] = useState<StatusShape | null>(null);

  // Poll every 2s
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const s = await getStatus();
        setStatus(s);
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  if (!status) {
    return <p className="p-4 text-white">Loading game state…</p>;
  }

  return (
    <div className="p-4 text-white">
      <h1 className="text-3xl font-bold mb-4">Halloween Monsters</h1>
      <TurnOrder order={status.turn_order} />

      <div className="mb-6">
        <Battlefield monsters={status.battlefield} />
      </div>

      <div className="mb-6">
        <Reserve monsters={status.reserve} />
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Kill Log</h2>
        {status.kill_history.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1">
            {status.kill_history.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        ) : (
          <p>No kills so far.</p>
        )}
      </div>
    </div>
  );
}
