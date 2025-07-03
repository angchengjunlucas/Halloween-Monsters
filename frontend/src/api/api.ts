// frontend/src/api/api.ts
const BASE_URL = "http://localhost:8000";

export async function getStatus() {
  const resp = await fetch(`${BASE_URL}/status`);
  if (!resp.ok) {
    // Force a throw, so your useEffect catch runs
    throw new Error(`Status check failed: ${resp.status}`);
  }
  return resp.json();
}

export async function startGame(playerNames: string[], alliances: string[][]) {
  const resp = await fetch(`${BASE_URL}/start_game`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_names: playerNames, alliances }),
  });
  return resp.json();
}


export async function redistributeVP(allianceName: string, newVPs: number[]) {
  const resp = await fetch(`${BASE_URL}/redistribute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alliance_name: allianceName, new_vps: newVPs }),
  });
  return resp.json();
}

export async function startRound() {
  const resp = await fetch(`${BASE_URL}/start_round`);
  return resp.json();
}

export async function submitMove(playerName: string, position: number, weapon: string) {
  const resp = await fetch(`${BASE_URL}/submit_move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_name: playerName, position, weapon_name: weapon }),
  });
  return resp.json();
}

export async function resolveRound() {
  const resp = await fetch(`${BASE_URL}/resolve_round`);
  return resp.json();
}

export async function gameOver() {
  const resp = await fetch(`${BASE_URL}/game_over`);
  return resp.json();
}

export async function getPlayerWeapons(playerName: string) {
  const resp = await fetch(`${BASE_URL}/player_weapons/${playerName}`);
  return resp.json();
}

// ← NEW:
export async function resetGame() {
  const resp = await fetch(`${BASE_URL}/reset_game`, { method: "POST" });
  return resp.json();
}
