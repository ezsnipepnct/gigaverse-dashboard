import time
from termcolor import colored
from giga_cli_bot.game_manager import GameManager
from giga_cli_bot.mcts_api_v2 import get_best_action, determine_outcome

class WebGameManager(GameManager):
    """Extended GameManager that emits events for web UI"""
    
    def __init__(self, api_manager, state_manager, loot_manager, ui_manager, event_emitter):
        super().__init__(api_manager, state_manager, loot_manager, ui_manager)
        self.event_emitter = event_emitter
    
    def emit_event(self, category, message, data=None):
        """Emit an event to the web UI"""
        self.event_emitter.emit("game_flow", category, message, data)
    
    def play_game(self, mode, action_token=None, initial_run=None):
        """Main game loop with web UI event emission"""
        self.reset_game_stats()
        self.emit_event("start", f"🚀 Starting {mode.capitalize()} Mode dungeon run...")
        
        # If this is part of a multi-run, action_token and initial_run will be provided
        dungeon_id = 0  # For actions after start
        
        if not action_token:  # This is a standalone run
            # Select dungeon ID based on mode
            if mode == "normal":
                start_dungeon_id = 1
            elif mode == "gigus":
                start_dungeon_id = 2
            elif mode == "underhaul":
                start_dungeon_id = 3
            else:
                start_dungeon_id = 1
            
            self.emit_event("info", f"🎯 Selected {mode.capitalize()} Mode (Dungeon ID: {start_dungeon_id})")
            
            # Start the run
            start_response = self.api_manager.send_action("start_run", "", start_dungeon_id, self.api_manager.DEFAULT_ACTION_DATA)
            if not start_response or not start_response.get("success"):
                self.emit_event("error", "❌ Failed to start dungeon run.")
                return None
                
            action_token = start_response.get("actionToken")
            run = start_response["data"]["run"]
            
            self.emit_event("success", "✅ Successfully started dungeon run!")
        else:
            # We already have a token and run from multi-run
            run = initial_run
            self.emit_event("success", "✅ Successfully started dungeon run!")
        
        game_over = False
        
        # Main game loop
        while not game_over:
            if run.get("lootPhase"):
                # Handle loot phase
                self.emit_event("loot", f"🎁 LOOT PHASE - Floor {self.current_floor} Room {self.current_room}")
                
                loot_options = run.get("lootOptions", [])
                if not loot_options:
                    self.emit_event("error", "⚠️ Loot phase active but no loot options available.")
                    break
                
                # Display loot options
                loot_messages = []
                for i, option in enumerate(loot_options):
                    boon_type = option.get("boonTypeString", "Unknown")
                    val1 = option.get("selectedVal1", 0)
                    val2 = option.get("selectedVal2", 0)
                    description = self.loot_manager.get_loot_description(boon_type, val1, val2)
                    loot_messages.append(f"  [{i+1}] {description}")
                
                self.emit_event("loot", f"Available Loot Options:\n" + "\n".join(loot_messages))
                
                # Extract state data
                state_data, player_charges, enemy_charges = self.state_manager.extract_game_state(run)
                
                # Emit player status
                self.emit_event("info", f"Player Status:\n  ❤️ Health: {state_data['player_health']}/{state_data['player_max_health']}\n  🛡️ Shield: {state_data['player_shield']}/{state_data['player_max_shield']}", {
                    "player_health": state_data['player_health'],
                    "player_max_health": state_data['player_max_health'],
                    "player_shield": state_data['player_shield'],
                    "player_max_shield": state_data['player_max_shield']
                })
                
                # Get player and enemy stats
                player_stats = self.state_manager.get_player_stats(run)
                enemy_stats = self.state_manager.get_enemy_stats(run)
                
                # Select best loot option
                best_loot = self.loot_manager.select_best_loot_option(
                    loot_options, state_data, player_stats, enemy_stats, 
                    player_charges, enemy_charges, sim_iterations=self.settings['sim_iterations'],
                    current_floor=self.current_floor, current_room=self.current_room
                )
                
                # Display selected loot
                boon_type = best_loot.get("boonTypeString", "Unknown")
                val1 = best_loot.get("selectedVal1", 0)
                val2 = best_loot.get("selectedVal2", 0)
                description = self.loot_manager.get_loot_description(boon_type, val1, val2)
                self.emit_event("success", f"✅ Selected loot: {description}")
                self.loot_history.append(description)
                
                # Use the action that was assigned to the loot option
                loot_action = best_loot.get("action")
                if not loot_action:
                    self.emit_event("info", "⚠️ Warning: No action set for loot option, defaulting to loot_two")
                    loot_action = "loot_two"  # fallback if action key is not set
                else:
                    self.emit_event("info", f"Executing loot action: {loot_action}")
                
                loot_response = self.api_manager.send_action(loot_action, action_token, dungeon_id, self.api_manager.DEFAULT_ACTION_DATA)
                
                if not loot_response or not loot_response.get("success"):
                    self.emit_event("error", "❌ Failed to choose loot option.")
                    break
                
                # Update action token and run data
                new_token = loot_response.get("actionToken")
                if new_token:
                    action_token = new_token
                
                run = loot_response["data"]["run"]
                
                # Prepare for next room
                self.current_room += 1
                if self.current_room > self.ENEMIES_PER_FLOOR:
                    self.current_floor += 1
                    self.current_room = 1
                    self.emit_event("victory", f"🏆 ADVANCING TO FLOOR {self.current_floor}! 🏆")
            else:
                # Combat phase
                self.emit_event("combat", f"⚔️ COMBAT - Floor {self.current_floor} Room {self.current_room}")
                
                # Extract state data
                state_data, player_charges, enemy_charges = self.state_manager.extract_game_state(run)
                
                # Display enemy details
                enemy = run["players"][1]
                enemy_name = enemy.get("name", "Unknown Enemy")
                self.emit_event("combat", f"Enemy: {enemy_name}\n  ❤️ Health: {state_data['enemy_health']}/{state_data['enemy_max_health']}\n  🛡️ Shield: {state_data['enemy_shield']}/{state_data['enemy_max_shield']}")
                
                # Display player status with real data
                self.emit_event("info", f"Player Status:\n  ❤️ Health: {state_data['player_health']}/{state_data['player_max_health']}\n  🛡️ Shield: {state_data['player_shield']}/{state_data['player_max_shield']}", {
                    "player_health": state_data['player_health'],
                    "player_max_health": state_data['player_max_health'],
                    "player_shield": state_data['player_shield'],
                    "player_max_shield": state_data['player_max_shield'],
                    "enemy_health": state_data['enemy_health'],
                    "enemy_max_health": state_data['enemy_max_health'],
                    "enemy_shield": state_data['enemy_shield'],
                    "enemy_max_shield": state_data['enemy_max_shield'],
                    "floor": self.current_floor,
                    "room": self.current_room
                })
                
                # Display move charges
                charges_text = f"Move Charges:\n  🪨 Rock: {player_charges['rock']}/3\n  📄 Paper: {player_charges['paper']}/3\n  ✂️ Scissor: {player_charges['scissor']}/3"
                self.emit_event("info", charges_text)
                
                # Get base player stats
                player_stats = self.state_manager.get_player_stats(run)
                
                # Apply equipment bonuses
                equipment = run["players"][0].get("equipment", [])
                player_stats, state_data = self.state_manager.apply_equipment_bonuses(player_stats, state_data, equipment)
                
                # Display move stats
                stats_text = f"Move Stats:\n  🪨 Rock: {player_stats['rock']['damage']} DMG, {player_stats['rock']['shield']} Shield\n  📄 Paper: {player_stats['paper']['damage']} DMG, {player_stats['paper']['shield']} Shield\n  ✂️ Scissor: {player_stats['scissor']['damage']} DMG, {player_stats['scissor']['shield']} Shield"
                self.emit_event("info", stats_text)
                
                # Get enemy stats
                enemy_stats = self.state_manager.get_enemy_stats(run)
                
                # Prepare API data
                api_data = {
                    "player_move_stats": player_stats,
                    "enemy_move_stats": enemy_stats,
                    "initial_state": state_data,
                    "player_charges": player_charges,
                    "enemy_charges": enemy_charges
                }
                
                # Calculate best move
                self.emit_event("info", "🧠 Calculating best move...")
                best_move = get_best_action(api_data, iterations=self.settings['mcts_iterations'])
                move_symbol = "🪨" if best_move == "rock" else "📄" if best_move == "paper" else "✂️"
                self.emit_event("combat", f"Selected move: {move_symbol} {best_move.upper()}")
                
                # Execute move
                move_response = self.api_manager.send_action(best_move, action_token, dungeon_id, self.api_manager.DEFAULT_ACTION_DATA)
                if not move_response or not move_response.get("success"):
                    self.emit_event("error", f"❌ Failed to execute move: {best_move}")
                    break
                
                # Parse the round result
                if move_response["data"].get("moves"):
                    player_move = move_response["data"]["moves"][0].get("move")
                    enemy_move = move_response["data"]["moves"][1].get("move")
                    outcome = determine_outcome(player_move, enemy_move)
                    
                    p_symbol = "🪨" if player_move == "rock" else "📄" if player_move == "paper" else "✂️"
                    e_symbol = "🪨" if enemy_move == "rock" else "📄" if enemy_move == "paper" else "✂️"
                    
                    result = "VICTORY" if outcome == "player" else "DEFEAT" if outcome == "enemy" else "TIE"
                    result_symbol = "✅" if outcome == "player" else "❌" if outcome == "enemy" else "➖"
                    
                    self.emit_event("combat", f"Round Result: {result_symbol} {result}\n  Player: {p_symbol} {player_move.upper()} vs Enemy: {e_symbol} {enemy_move.upper()}")
                
                new_token = move_response.get("actionToken")
                if new_token and new_token != action_token:
                    action_token = new_token
                
                run = move_response["data"]["run"]
                
                # Check if enemy was defeated
                new_state, _, _ = self.state_manager.extract_game_state(run)
                if new_state["enemy_health"] <= 0:
                    self.total_enemies_defeated += 1
                    self.emit_event("victory", f"🏆 ENEMY DEFEATED! (Total: {self.total_enemies_defeated})")
                
                if run["players"][0]["health"]["current"] <= 0:
                    self.emit_event("death", f"💀 Game Over: Player's health reached 0.\nTotal enemies defeated: {self.total_enemies_defeated}\nMade it to Floor {self.current_floor}, Room {self.current_room}")
                    game_over = True
                
                time.sleep(1)
        
        # End of game summary
        if not initial_run:
            final_stats = {
                "enemies_defeated": self.total_enemies_defeated,
                "final_floor": self.current_floor,
                "final_room": self.current_room,
                "loot_collected": len(self.loot_history)
            }
            
            if game_over:
                self.emit_event("death", f"🎮 Game Complete!\n  Enemies Defeated: {self.total_enemies_defeated}\n  Final Position: Floor {self.current_floor}, Room {self.current_room}\n  Loot Collected: {len(self.loot_history)} items")
            else:
                self.emit_event("victory", f"🎮 Run Complete!\n  Enemies Defeated: {self.total_enemies_defeated}\n  Final Position: Floor {self.current_floor}, Room {self.current_room}\n  Loot Collected: {len(self.loot_history)} items")
            
            return final_stats
        
        return {
            "enemies_defeated": self.total_enemies_defeated,
            "final_floor": self.current_floor,
            "final_room": self.current_room,
            "loot_collected": len(self.loot_history)
        } 