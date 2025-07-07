import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from main import GameEngine, Player

MONSTER_SLUGS = [
    "zombie","icequeen","warrior","werewolf","gargoyle",
    "goblin","golem","mermaid","mummy","ogre",
    "seaking","vampire","littledevil","witch","wizard",
]

def slug_for_id(mid: int) -> str:
    return MONSTER_SLUGS[mid-1] if 1 <= mid <= len(MONSTER_SLUGS) else f"monster{mid}"

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

@app.post("/start_game")
def start_game(req: SetupRequest):
    global engine
    if engine and not engine.is_game_over():
        raise HTTPException(400, "Game already in progress")
    monster_data = GameEngine.generate_monster_data_from_file()
    engine = GameEngine(req.player_names, monster_data, req.alliances, initial_field_size=3)
    return {"status": "game started"}

@app.get("/status")
def full_status():
    if not engine:
        raise HTTPException(400, "No game started")
    bf = engine.get_battlefield_status()
    rv = engine.get_reserve_status()
    return {
        "battlefield": [{**m, "name": slug_for_id(m["id"])} for m in bf],
        "reserve":     [{**m, "name": slug_for_id(m["id"])} for m in rv],
        "turn_order":  [p.name for p in (engine.current_turn_order or [])],
        "round_started": engine.current_turn_order is not None,
        "alliances":[
            {"name": a.name,
             "members": [p.name for p in a.players],
             "vp_distribution": [p.vp for p in a.players]}
            for a in engine.alliances
        ],
        "submitted_moves": list(engine.submitted_moves.keys()),
        "kill_history": engine.kill_history,
    }

@app.post("/redistribute")
def redistribute(req: RedistributeRequest):
    if not engine:
        raise HTTPException(400, "No game started")
    alliance = next((a for a in engine.alliances if a.name == req.alliance_name), None)
    if not alliance:
        raise HTTPException(404, "Alliance not found")
    if len(req.new_vps) != len(alliance.players):
        raise HTTPException(400, "VP count mismatch")
    transfers: Dict[Player,int] = {
        alliance.players[i]: req.new_vps[i] for i in range(len(alliance.players))
    }
    try:
        alliance.exchange_points(transfers)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"status": "redistributed"}

@app.get("/start_round")
def start_round():
    if not engine:
        raise HTTPException(400, "No game started")
    engine.get_turn_order()
    return {"turn_order": [p.name for p in engine.current_turn_order]}

@app.post("/submit_move")
def submit_move(req: MoveRequest):
    if not engine:
        raise HTTPException(400, "No game started")
    # record the move via your engine API
    engine.submit_move(req.player_name, req.position, req.weapon_name)
    return {"status": "move recorded"}

@app.get("/resolve_round")
def resolve_round():
    if not engine:
        raise HTTPException(400, "No game started")
    events = engine.resolve_round()
    mapped = [
        {"player": e["player"], "monster_id": e["monster_id"], "slug": slug_for_id(e["monster_id"])}
        for e in events
    ]
    return {"kill_announcements": mapped}

@app.get("/game_over")
def game_over():
    if not engine or not engine.is_game_over():
        return {"over": False}
    w = engine.get_winner()
    return {"over": True, "winning_alliance": w.name}

@app.post("/reset_game")
def reset_game():
    global engine
    engine = None
    return {"status": "reset"}

@app.get("/player_weapons/{player_name}")
def get_player_weapons(player_name: str):
    if engine is None:
        raise HTTPException(400, "No game started")
    p = next((pl for pl in engine.players if pl.name == player_name), None)
    if p is None:
        raise HTTPException(404, "Player not found")
    return [(w.name, w.attack_power) for w in p.weapons]
