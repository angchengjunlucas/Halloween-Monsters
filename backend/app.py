# backend/app.py
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import random
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from fastapi.middleware.cors import CORSMiddleware
from main import (
    GameEngine, Monster, Weapon, Player, Alliance
)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine: Optional[GameEngine] = None

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

def generate_monster_data(count: int = 15):
    special_weapons = [
        Weapon("Poison", 1),
        Weapon("Ice", 3),
        Weapon("Dual Sword", 4),
        Weapon("Grenade", 6),
        Weapon("Dynamite", 10),
    ]
    data = []
    for i in range(1, count + 1):
        loot = random.choice(special_weapons)
        health = random.randint(3, 10)
        data.append((i, health, loot))
    return data

# ─── DEFINE YOUR MONSTER SLUGS ───────────────────────────────────────────────
# The order here determines which slug corresponds to position 1, 2, 3, etc.
MONSTER_SLUGS = [
    "zombie",
    "icequeen",
    "warrior",
    "werewolf",
    "gargoyle",
    "goblin",
    "golem",
    "mermaid",
    "mummy",
    "ogre",
    "seaking",
    "vampire",
    "littledevil",
    "witch",
    "wizard",
]

# ─── HELPER: MAP POSITION → SLUG ─────────────────────────────────────────────
def slug_for_position(pos: int) -> str:
    # Positions are 1-based.
    idx = pos - 1
    if 0 <= idx < len(MONSTER_SLUGS):
        return MONSTER_SLUGS[idx]
    return f"monster{pos}"

@app.post("/start_game")
def start_game(req: SetupRequest):
    global engine
    if engine is not None and not engine.is_game_over():
        raise HTTPException(status_code=400, detail="A game is already in progress.")
    monster_data = generate_monster_data()
    engine = GameEngine(
        player_names=req.player_names,
        monster_data=monster_data,
        faction_lists=req.alliances
    )
    return {"status": "game started", "players": req.player_names, "alliances": req.alliances}

@app.get("/battlefield")
def get_battlefield():
    if engine is None:
        raise HTTPException(status_code=400, detail="No game started.")
    raw_list = engine.get_battlefield_status()
    mapped = []
    for m in raw_list:
        mapped.append({
            "position": m["position"],
            "name": slug_for_position(m["position"]),
            "health": m["health"],
            "max_health": m.get("max_health", m["health"]),
            "loot": m["loot"],
        })
    return mapped

@app.get("/reserve")
def get_reserve():
    if engine is None:
        raise HTTPException(status_code=400, detail="No game started.")
    raw_list = engine.get_reserve_status()
    mapped = []
    for m in raw_list:
        mapped.append({
            "position": m["position"],
            "name": slug_for_position(m["position"]),
            "health": m["health"],
            "loot": m["loot"],
        })
    return mapped

@app.post("/redistribute")
def redistribute_vp(req: RedistributeRequest):
    if engine is None:
        raise HTTPException(status_code=400, detail="No game started.")
    alliance = next((a for a in engine.alliances if a.name == req.alliance_name), None)
    if alliance is None:
        raise HTTPException(status_code=404, detail="Alliance not found.")
    if len(req.new_vps) != len(alliance.players):
        raise HTTPException(status_code=400, detail="Value count mismatch.")
    transfers: Dict[Player, int] = {
        alliance.players[i]: req.new_vps[i] for i in range(len(alliance.players))
    }
    try:
        alliance.exchange_points(transfers)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "redistributed", "alliance": alliance.name}

@app.post("/submit_move")
def submit_move(req: MoveRequest):
    if engine is None:
        raise HTTPException(status_code=400, detail="No game started.")
    player = next((p for p in engine.players if p.name == req.player_name), None)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found.")
    weapons = [w.name for w in player.weapons]
    if req.weapon_name not in weapons:
        raise HTTPException(status_code=400, detail="Weapon not in hand.")
    bf_positions = [m["position"] for m in engine.get_battlefield_status()]
    if req.position not in bf_positions:
        raise HTTPException(status_code=400, detail="Invalid battlefield position.")
    engine.submit_move(req.player_name, req.position, req.weapon_name)
    return {"status": "move recorded", "player": req.player_name}

@app.get("/start_round")
def start_round():
    if engine is None:
        raise HTTPException(status_code=400, detail="No game started.")
    engine.get_turn_order()
    return {"turn_order": [p.name for p in engine.current_turn_order]}

@app.get("/resolve_round")
def resolve_round():
    if engine is None:
        raise HTTPException(status_code=400, detail="No game started.")
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
        raise HTTPException(status_code=400, detail="No game started.")
    round_started = engine.current_turn_order is not None
    turn_order_list = [p.name for p in engine.current_turn_order] if round_started else []
    return {
        "battlefield": [
            {
                "position": m["position"],
                "name": slug_for_position(m["position"]),
                "health": m["health"],
                "max_health": m.get("max_health", m["health"]),
                "loot": m["loot"],
            }
            for m in engine.get_battlefield_status()
        ],
        "reserve": [
            {
                "position": m["position"],
                "name": slug_for_position(m["position"]),
                "health": m["health"],
                "loot": m["loot"],
            }
            for m in engine.get_reserve_status()
        ],
        "turn_order": turn_order_list,
        "round_started": round_started,
        "alliances": [
            {
                "name": a.name,
                "members": [p.name for p in a.players],
                "vp_distribution": [p.vp for p in a.players]
            }
            for a in engine.alliances
        ],
        "submitted_moves": list(engine.submitted_moves.keys()),
        "kill_history": engine.kill_history
    }

@app.get("/player_weapons/{player_name}")
def get_player_weapons(player_name: str):
    if engine is None:
        raise HTTPException(status_code=400, detail="No game started.")
    p = next((pl for pl in engine.players if pl.name == player_name), None)
    if p is None:
        raise HTTPException(status_code=404, detail="Player not found.")
    return [(w.name, w.attack_power) for w in p.weapons]
