# backend/app.py
import json, os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional

from main import GameEngine, Weapon, Player

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine: Optional[GameEngine] = None

# ─── STATIC MONSTER CONFIG ────────────────────────────────────────────────────
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "monsters.json")
MONSTER_CONFIG = json.load(open(CONFIG_PATH))  # list of {name, health, loot}

LOOT_WEAPONS: Dict[str, Weapon] = {
    "Poison": Weapon("Poison", 1),
    "Ice": Weapon("Ice", 3),
    "Dual Sword": Weapon("Dual Sword", 4),
    "Grenade": Weapon("Grenade", 6),
    "Dynamite": Weapon("Dynamite", 10),
}

# Build monster_data as [(name, health, lootWeapon), …]
def generate_monster_data():
    data = []
    for entry in MONSTER_CONFIG:
        name = entry["name"]
        hp = entry["health"]
        loot_name = entry.get("loot")
        loot = LOOT_WEAPONS.get(loot_name)
        data.append((name, hp, loot))
    return data

# ─── REQUEST MODELS ────────────────────────────────────────────────────────────
class SetupRequest(BaseModel):
    player_names: List[str]
    alliances: List[List[str]]

class RedistributeRequest(BaseModel):
    alliance_name: str
    new_vps: List[int]

class MoveRequest(BaseModel):
    player_name: str
    position: int
    weapon_name: str

# ─── ENDPOINTS ────────────────────────────────────────────────────────────────

@app.post("/reset_game")
def reset_game():
    global engine
    engine = None
    return {"status": "reset"}

@app.post("/start_game")
def start_game(req: SetupRequest):
    global engine
    if engine is not None:
        raise HTTPException(400, "Game already started.")
    monster_data = generate_monster_data()
    engine = GameEngine(
        player_names=req.player_names,
        monster_data=monster_data,
        faction_lists=req.alliances
    )
    return {"status": "game started"}

@app.get("/battlefield")
def get_battlefield():
    if engine is None:
        raise HTTPException(400, "No game started.")
    # Now each monster dict returned by your GameEngine
    # should include its .name field (string slug), health, loot, etc.
    return engine.get_battlefield_status()

@app.get("/reserve")
def get_reserve():
    if engine is None:
        raise HTTPException(400, "No game started.")
    return engine.get_reserve_status()

@app.post("/redistribute")
def redistribute_vp(req: RedistributeRequest):
    if engine is None:
        raise HTTPException(400, "No game started.")
    alliance = next((a for a in engine.alliances if a.name == req.alliance_name), None)
    if not alliance:
        raise HTTPException(404, "Alliance not found.")
    if len(req.new_vps) != len(alliance.players):
        raise HTTPException(400, "Value count mismatch.")
    transfers: Dict[Player, int] = {
        alliance.players[i]: req.new_vps[i]
        for i in range(len(alliance.players))
    }
    try:
        alliance.exchange_points(transfers)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"status": "redistributed"}

@app.post("/submit_move")
def submit_move(req: MoveRequest):
    if engine is None:
        raise HTTPException(400, "No game started.")
    player = next((p for p in engine.players if p.name == req.player_name), None)
    if not player:
        raise HTTPException(404, "Player not found.")
    weapons = [w.name for w in player.weapons]
    if req.weapon_name not in weapons:
        raise HTTPException(400, "Weapon not in hand.")
    positions = [m["position"] for m in engine.get_battlefield_status()]
    if req.position not in positions:
        raise HTTPException(400, "Invalid battlefield position.")
    engine.submit_move(req.player_name, req.position, req.weapon_name)
    return {"status": "move recorded"}

@app.get("/start_round")
def start_round():
    if engine is None:
        raise HTTPException(400, "No game started.")
    engine.get_turn_order()
    return {"turn_order": [p.name for p in engine.current_turn_order]}

@app.get("/resolve_round")
def resolve_round():
    if engine is None:
        raise HTTPException(400, "No game started.")
    kills = engine.resolve_round()
    return {"kill_announcements": kills}

@app.get("/game_over")
def game_over():
    if engine is None:
        return {"over": False}
    if engine.is_game_over():
        w = engine.get_winner()
        return {"over": True, "winning_alliance": w.name, "avg_vp": w.average_vp()}
    return {"over": False}

@app.get("/status")
def full_status():
    if engine is None:
        raise HTTPException(400, "No game started.")
    started = engine.current_turn_order is not None
    return {
        "battlefield": engine.get_battlefield_status(),
        "reserve": engine.get_reserve_status(),
        "turn_order": [p.name for p in engine.current_turn_order] if started else [],
        "round_started": started,
        "alliances": [
            {
                "name": a.name,
                "members": [p.name for p in a.players],
                "vp_distribution": [p.vp for p in a.players],
            }
            for a in engine.alliances
        ],
        "submitted_moves": list(engine.submitted_moves.keys()),
        "kill_history": engine.kill_history,
    }

@app.get("/player_weapons/{player_name}")
def get_player_weapons(player_name: str):
    if engine is None:
        raise HTTPException(400, "No game started.")
    p = next((pl for pl in engine.players if pl.name == player_name), None)
    if not p:
        raise HTTPException(404, "Player not found.")
    return [(w.name, w.attack_power) for w in p.weapons]
