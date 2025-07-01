import json
from typing import Dict, List, Any
from datetime import datetime
from collections import deque

class SyncEventEmitter:
    def __init__(self):
        self.event_queue = deque()
        self.is_active = True
        
    def emit_event(self, event_type: str, data: Dict[str, Any], category: str = "general"):
        """Emit a structured event to the queue"""
        if not self.is_active:
            return
            
        event = {
            "type": event_type,
            "category": category,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        
        self.event_queue.append(event)
    
    def get_events(self) -> List[Dict[str, Any]]:
        """Get all queued events and clear the queue"""
        events = list(self.event_queue)
        self.event_queue.clear()
        return events
    
    # Game Flow Events
    def emit_game_start(self, mode: str, run_number: int = 1, total_runs: int = 1):
        """Emit game start event"""
        self.emit_event("game_start", {
            "mode": mode,
            "run_number": run_number,
            "total_runs": total_runs,
            "message": f"🚀 Starting {mode.capitalize()} Mode dungeon run..."
        }, "game_flow")
    
    def emit_game_end(self, stats: Dict[str, Any]):
        """Emit game end event with statistics"""
        self.emit_event("game_end", {
            "stats": stats,
            "message": "🎮 Game completed!"
        }, "game_flow")
    
    def emit_phase_change(self, phase: str, floor: int, room: int, details: Dict[str, Any] = None):
        """Emit phase change event (combat/loot)"""
        phase_emoji = "⚔️" if phase == "combat" else "🎁" if phase == "loot" else "🚀"
        message = f"{phase_emoji} {phase.upper()} - Floor {floor} Room {room}"
        
        self.emit_event("phase_change", {
            "phase": phase,
            "floor": floor,
            "room": room,
            "message": message,
            "details": details or {}
        }, "game_flow")
    
    # Combat Events
    def emit_enemy_info(self, enemy_name: str, health: int, max_health: int, shield: int, max_shield: int):
        """Emit enemy information"""
        self.emit_event("enemy_info", {
            "name": enemy_name,
            "health": health,
            "max_health": max_health,
            "shield": shield,
            "max_shield": max_shield,
            "health_percentage": (health / max_health) * 100 if max_health > 0 else 0,
            "message": f"Enemy: {enemy_name} | ❤️ {health}/{max_health} | 🛡️ {shield}/{max_shield}"
        }, "combat")
    
    def emit_player_status(self, health: int, max_health: int, shield: int, max_shield: int):
        """Emit player status"""
        health_percentage = (health / max_health) * 100 if max_health > 0 else 0
        warning = "critical" if health_percentage < 30 else "low" if health_percentage < 50 else None
        
        warning_text = ""
        if warning == "critical":
            warning_text = f" ⚠️ CRITICAL ({health_percentage:.1f}%)"
        elif warning == "low":
            warning_text = f" ⚠️ LOW ({health_percentage:.1f}%)"
        
        self.emit_event("player_status", {
            "health": health,
            "max_health": max_health,
            "shield": shield,
            "max_shield": max_shield,
            "health_percentage": health_percentage,
            "warning": warning,
            "message": f"Player: ❤️ {health}/{max_health} | 🛡️ {shield}/{max_shield}{warning_text}"
        }, "player")
    
    def emit_move_charges(self, rock: int, paper: int, scissor: int):
        """Emit current move charges"""
        self.emit_event("move_charges", {
            "rock": rock,
            "paper": paper,
            "scissor": scissor,
            "message": f"Charges: 🪨 {rock}/3 | 📄 {paper}/3 | ✂️ {scissor}/3"
        }, "player")
    
    def emit_move_stats(self, move_stats: Dict[str, Dict[str, int]]):
        """Emit move statistics"""
        stats_text = []
        for move, stats in move_stats.items():
            symbol = "🪨" if move == "rock" else "📄" if move == "paper" else "✂️"
            stats_text.append(f"{symbol} {move.capitalize()}: {stats['damage']} DMG, {stats['shield']} Shield")
        
        self.emit_event("move_stats", {
            "stats": move_stats,
            "message": "Move Stats: " + " | ".join(stats_text)
        }, "player")
    
    def emit_move_calculation(self, message: str = "Calculating best move..."):
        """Emit move calculation status"""
        self.emit_event("move_calculation", {
            "message": f"🤔 {message}",
            "status": "calculating"
        }, "combat")
    
    def emit_move_selected(self, move: str, symbol: str):
        """Emit selected move"""
        self.emit_event("move_selected", {
            "move": move,
            "symbol": symbol,
            "message": f"Selected move: {symbol} {move.upper()}"
        }, "combat")
    
    def emit_round_result(self, player_move: str, enemy_move: str, outcome: str, 
                           player_symbol: str, enemy_symbol: str):
        """Emit round combat result"""
        result_map = {
            "player": {"text": "VICTORY", "symbol": "✅"},
            "enemy": {"text": "DEFEAT", "symbol": "❌"},
            "tie": {"text": "TIE", "symbol": "➖"}
        }
        
        result_info = result_map.get(outcome, {"text": "UNKNOWN", "symbol": "❓"})
        
        self.emit_event("round_result", {
            "player_move": player_move,
            "enemy_move": enemy_move,
            "player_symbol": player_symbol,
            "enemy_symbol": enemy_symbol,
            "outcome": outcome,
            "result_text": result_info["text"],
            "result_symbol": result_info["symbol"],
            "message": f"Round Result: {result_info['symbol']} {result_info['text']} | Player: {player_symbol} {player_move.upper()} vs Enemy: {enemy_symbol} {enemy_move.upper()}"
        }, "combat")
    
    def emit_enemy_defeated(self, total_defeated: int):
        """Emit enemy defeated event"""
        self.emit_event("enemy_defeated", {
            "total_defeated": total_defeated,
            "message": f"🏆 ENEMY DEFEATED! (Total: {total_defeated})"
        }, "combat")
    
    # Loot Events
    def emit_loot_options(self, loot_options: List[Dict[str, Any]]):
        """Emit available loot options"""
        options_text = []
        for i, option in enumerate(loot_options):
            description = option.get("description", "Unknown loot")
            options_text.append(f"[{i+1}] {description}")
        
        self.emit_event("loot_options", {
            "options": loot_options,
            "message": "Available Loot Options:\n" + "\n".join(options_text)
        }, "loot")
    
    def emit_loot_selected(self, description: str, action: str):
        """Emit selected loot"""
        self.emit_event("loot_selected", {
            "description": description,
            "action": action,
            "message": f"✅ Selected loot: {description}"
        }, "loot")
    
    # Progress Events
    def emit_floor_advance(self, new_floor: int):
        """Emit floor advancement"""
        self.emit_event("floor_advance", {
            "floor": new_floor,
            "message": f"🏆 ADVANCING TO FLOOR {new_floor}! 🏆"
        }, "progress")
    
    def emit_energy_claim(self, amount: int, success: bool):
        """Emit energy claiming result"""
        self.emit_event("energy_claim", {
            "amount": amount,
            "success": success,
            "message": f"🔋 {'Energy claimed: ' + str(amount) if success else 'Energy claim failed'}"
        }, "system")
    
    # System Events
    def emit_error(self, error_message: str, error_type: str = "general"):
        """Emit error event"""
        self.emit_event("error", {
            "message": f"❌ {error_message}",
            "error_type": error_type
        }, "error")
    
    def emit_warning(self, warning_message: str):
        """Emit warning event"""
        self.emit_event("warning", {
            "message": f"⚠️ {warning_message}"
        }, "warning")
    
    def emit_success(self, success_message: str):
        """Emit success event"""
        self.emit_event("success", {
            "message": f"✅ {success_message}"
        }, "success")
    
    def emit_info(self, info_message: str):
        """Emit info event"""
        self.emit_event("info", {
            "message": f"ℹ️ {info_message}"
        }, "info")
    
    def emit_session_summary(self, stats: Dict[str, Any]):
        """Emit session summary"""
        self.emit_event("session_summary", {
            "stats": stats,
            "message": "🎮 Session Summary"
        }, "summary")
    
    def stop(self):
        """Stop the emitter"""
        self.is_active = False 