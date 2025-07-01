import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime

class GameEventEmitter:
    def __init__(self, websocket):
        self.websocket = websocket
        self.is_connected = True
        
    async def emit_event(self, event_type: str, data: Dict[str, Any], category: str = "general"):
        """Emit a structured event to the WebSocket"""
        if not self.is_connected:
            return
            
        try:
            event = {
                "type": event_type,
                "category": category,
                "data": data,
                "timestamp": datetime.now().isoformat()
            }
            
            await self.websocket.send_text(json.dumps(event))
            # Small delay to prevent overwhelming the client
            await asyncio.sleep(0.01)
        except Exception as e:
            print(f"Failed to emit event: {e}")
            self.is_connected = False
    
    # Game Flow Events
    async def emit_game_start(self, mode: str, run_number: int = 1, total_runs: int = 1):
        """Emit game start event"""
        await self.emit_event("game_start", {
            "mode": mode,
            "run_number": run_number,
            "total_runs": total_runs,
            "message": f"🚀 Starting {mode.capitalize()} Mode dungeon run..."
        }, "game_flow")
    
    async def emit_game_end(self, stats: Dict[str, Any]):
        """Emit game end event with statistics"""
        await self.emit_event("game_end", {
            "stats": stats,
            "message": "🎮 Game completed!"
        }, "game_flow")
    
    async def emit_phase_change(self, phase: str, floor: int, room: int, details: Dict[str, Any] = None):
        """Emit phase change event (combat/loot)"""
        phase_emoji = "⚔️" if phase == "combat" else "🎁" if phase == "loot" else "🚀"
        message = f"{phase_emoji} {phase.upper()} - Floor {floor} Room {room}"
        
        await self.emit_event("phase_change", {
            "phase": phase,
            "floor": floor,
            "room": room,
            "message": message,
            "details": details or {}
        }, "game_flow")
    
    # Combat Events
    async def emit_enemy_info(self, enemy_name: str, health: int, max_health: int, shield: int, max_shield: int):
        """Emit enemy information"""
        await self.emit_event("enemy_info", {
            "name": enemy_name,
            "health": health,
            "max_health": max_health,
            "shield": shield,
            "max_shield": max_shield,
            "health_percentage": (health / max_health) * 100 if max_health > 0 else 0
        }, "combat")
    
    async def emit_player_status(self, health: int, max_health: int, shield: int, max_shield: int):
        """Emit player status"""
        health_percentage = (health / max_health) * 100 if max_health > 0 else 0
        
        await self.emit_event("player_status", {
            "health": health,
            "max_health": max_health,
            "shield": shield,
            "max_shield": max_shield,
            "health_percentage": health_percentage,
            "warning": "critical" if health_percentage < 30 else "low" if health_percentage < 50 else None
        }, "player")
    
    async def emit_move_charges(self, rock: int, paper: int, scissor: int):
        """Emit current move charges"""
        await self.emit_event("move_charges", {
            "rock": rock,
            "paper": paper,
            "scissor": scissor
        }, "player")
    
    async def emit_move_stats(self, move_stats: Dict[str, Dict[str, int]]):
        """Emit move statistics"""
        await self.emit_event("move_stats", {
            "stats": move_stats
        }, "player")
    
    async def emit_move_calculation(self, message: str = "Calculating best move..."):
        """Emit move calculation status"""
        await self.emit_event("move_calculation", {
            "message": message,
            "status": "calculating"
        }, "combat")
    
    async def emit_move_selected(self, move: str, symbol: str):
        """Emit selected move"""
        await self.emit_event("move_selected", {
            "move": move,
            "symbol": symbol,
            "message": f"Selected move: {symbol} {move.upper()}"
        }, "combat")
    
    async def emit_round_result(self, player_move: str, enemy_move: str, outcome: str, 
                               player_symbol: str, enemy_symbol: str):
        """Emit round combat result"""
        result_map = {
            "player": {"text": "VICTORY", "symbol": "✅"},
            "enemy": {"text": "DEFEAT", "symbol": "❌"},
            "tie": {"text": "TIE", "symbol": "➖"}
        }
        
        result_info = result_map.get(outcome, {"text": "UNKNOWN", "symbol": "❓"})
        
        await self.emit_event("round_result", {
            "player_move": player_move,
            "enemy_move": enemy_move,
            "player_symbol": player_symbol,
            "enemy_symbol": enemy_symbol,
            "outcome": outcome,
            "result_text": result_info["text"],
            "result_symbol": result_info["symbol"],
            "message": f"Round Result: {result_info['symbol']} {result_info['text']}"
        }, "combat")
    
    async def emit_enemy_defeated(self, total_defeated: int):
        """Emit enemy defeated event"""
        await self.emit_event("enemy_defeated", {
            "total_defeated": total_defeated,
            "message": f"🏆 ENEMY DEFEATED! (Total: {total_defeated})"
        }, "combat")
    
    # Loot Events
    async def emit_loot_options(self, loot_options: List[Dict[str, Any]]):
        """Emit available loot options"""
        formatted_options = []
        for i, option in enumerate(loot_options):
            formatted_options.append({
                "index": i + 1,
                "description": option.get("description", "Unknown loot"),
                "boon_type": option.get("boonTypeString", "Unknown"),
                "val1": option.get("selectedVal1", 0),
                "val2": option.get("selectedVal2", 0)
            })
        
        await self.emit_event("loot_options", {
            "options": formatted_options,
            "message": "Available Loot Options:"
        }, "loot")
    
    async def emit_loot_selected(self, description: str, action: str):
        """Emit selected loot"""
        await self.emit_event("loot_selected", {
            "description": description,
            "action": action,
            "message": f"✅ Selected loot: {description}"
        }, "loot")
    
    # Progress Events
    async def emit_floor_advance(self, new_floor: int):
        """Emit floor advancement"""
        await self.emit_event("floor_advance", {
            "floor": new_floor,
            "message": f"🏆 ADVANCING TO FLOOR {new_floor}! 🏆"
        }, "progress")
    
    async def emit_energy_claim(self, amount: int, success: bool):
        """Emit energy claiming result"""
        await self.emit_event("energy_claim", {
            "amount": amount,
            "success": success,
            "message": f"🔋 {'Energy claimed: ' + str(amount) if success else 'Energy claim failed'}"
        }, "system")
    
    # System Events
    async def emit_error(self, error_message: str, error_type: str = "general"):
        """Emit error event"""
        await self.emit_event("error", {
            "message": f"❌ {error_message}",
            "error_type": error_type
        }, "error")
    
    async def emit_warning(self, warning_message: str):
        """Emit warning event"""
        await self.emit_event("warning", {
            "message": f"⚠️ {warning_message}"
        }, "warning")
    
    async def emit_success(self, success_message: str):
        """Emit success event"""
        await self.emit_event("success", {
            "message": f"✅ {success_message}"
        }, "success")
    
    async def emit_info(self, info_message: str):
        """Emit info event"""
        await self.emit_event("info", {
            "message": f"ℹ️ {info_message}"
        }, "info")
    
    async def emit_session_summary(self, stats: Dict[str, Any]):
        """Emit session summary"""
        await self.emit_event("session_summary", {
            "stats": stats,
            "message": "🎮 Session Summary"
        }, "summary")
    
    def disconnect(self):
        """Mark the emitter as disconnected"""
        self.is_connected = False 