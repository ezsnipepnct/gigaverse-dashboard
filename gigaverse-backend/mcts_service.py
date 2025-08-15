from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

# Reuse existing logic
from mcts_api_v2 import get_best_action
from loot_manager import LootManager

app = FastAPI(title="Gigaverse Local MCTS Service", version="1.0.0")

# Allow browser pings from the Next dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # safe here (local only); tighten if needed
    allow_methods=["*"],
    allow_headers=["*"],
)


class GameStatePayload(BaseModel):
    player_health: int
    player_shield: int
    enemy_health: int
    enemy_shield: int
    player_max_health: int
    player_max_shield: int
    enemy_max_health: int
    enemy_max_shield: int
    round_number: int = 1
    current_floor: Optional[int] = 1
    current_room: Optional[int] = 1
    player_charges: Dict[str, int]
    enemy_charges: Dict[str, int]
    player_move_stats: Dict[str, Dict[str, int]]
    enemy_move_stats: Dict[str, Dict[str, int]]


class MoveRequest(BaseModel):
    gameState: GameStatePayload
    iterations: Optional[int] = 25000


class MoveResponse(BaseModel):
    success: bool
    move: str


@app.post("/mcts/move", response_model=MoveResponse)
def mcts_move(req: MoveRequest):
    try:
        gs = req.gameState
        api_data = {
            "player_move_stats": gs.player_move_stats,
            "enemy_move_stats": gs.enemy_move_stats,
            "initial_state": {
                "player_health": gs.player_health,
                "player_shield": gs.player_shield,
                "enemy_health": gs.enemy_health,
                "enemy_shield": gs.enemy_shield,
                "player_max_health": gs.player_max_health,
                "player_max_shield": gs.player_max_shield,
                "enemy_max_health": gs.enemy_max_health,
                "enemy_max_shield": gs.enemy_max_shield,
                "round_number": gs.round_number,
            },
            "player_charges": gs.player_charges,
            "enemy_charges": gs.enemy_charges,
        }
        move = get_best_action(api_data, iterations=req.iterations or 25000)
        return MoveResponse(success=True, move=move)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class LootChooseRequest(BaseModel):
    gameState: GameStatePayload
    lootOptions: List[Dict[str, Any]]
    simIterations: Optional[int] = 100


@app.post("/loot/choose")
def loot_choose(req: LootChooseRequest):
    try:
        lm = LootManager()
        gs = req.gameState
        state_data = {
            "player_health": gs.player_health,
            "player_shield": gs.player_shield,
            "enemy_health": gs.enemy_health,
            "enemy_shield": gs.enemy_shield,
            "player_max_health": gs.player_max_health,
            "player_max_shield": gs.player_max_shield,
            "enemy_max_health": gs.enemy_max_health,
            "enemy_max_shield": gs.enemy_max_shield,
            "round_number": gs.round_number,
            "current_floor": gs.current_floor or 1,
            "current_room": gs.current_room or 1,
        }
        best_option = lm.select_best_loot_option(
            loot_options=list(req.lootOptions),
            state_data=state_data,
            player_move_stats=gs.player_move_stats,
            enemy_move_stats=gs.enemy_move_stats,
            player_charges=gs.player_charges,
            enemy_charges=gs.enemy_charges,
            sim_iterations=req.simIterations or 100,
            current_floor=gs.current_floor or 1,
            current_room=gs.current_room or 1,
        )
        # Find index in the original array
        index = 0
        for i, o in enumerate(req.lootOptions):
            if o == best_option:
                index = i
                break
        return {
            "success": True,
            "index": index,
            "loot": best_option,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"ok": True}


