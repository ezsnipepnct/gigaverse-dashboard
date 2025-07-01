import time
import sys
from termcolor import colored
from mcts_api_v2 import get_best_action, determine_outcome

class GameManager:
    def __init__(self, *args, **kwargs):
        """
        Initialize GameManager with flexible parameters.
        
        Original CLI format: GameManager(api_manager, state_manager, loot_manager, ui_manager)
        New WebSocket format: GameManager(jwt_token, event_emitter)
        """
        if len(args) == 4:
            # Original CLI format
            self.api_manager = args[0]
            self.state_manager = args[1]
            self.loot_manager = args[2]
            self.ui_manager = args[3]
            self.event_emitter = None
        elif len(args) == 2:
            # New WebSocket format
            jwt_token = args[0]
            self.event_emitter = args[1]
            
            # Initialize managers like in original gigaverse.py
            from api_manager import ApiManager
            from state_manager import StateManager
            from loot_manager import LootManager
            from ui_manager import UiManager
            
            self.api_manager = ApiManager(jwt_token)
            self.state_manager = StateManager()
            self.loot_manager = LootManager()
            self.ui_manager = UiManager()
        else:
            raise ValueError("GameManager requires either 4 arguments (CLI mode) or 2 arguments (WebSocket mode)")
        
        # Game tracking
        self.ENEMIES_PER_FLOOR = 4
        self.current_enemy_count = 0
        self.total_enemies_defeated = 0
        self.loot_history = []
        self.current_floor = 1
        self.current_room = 1
        
        # Settings
        self.settings = {
            'mcts_iterations': 50000,
            'sim_iterations': 100
        }
    
    def set_event_emitter(self, event_emitter):
        """Set the event emitter for web interface logging"""
        self.event_emitter = event_emitter
    
    def set_sync_event_emitter(self, sync_emitter):
        """Set the synchronous event emitter for web interface logging"""
        self.sync_emitter = sync_emitter
    
    async def emit_event(self, method_name, *args, **kwargs):
        """Helper to emit events if event emitter is available"""
        if self.event_emitter:
            try:
                method = getattr(self.event_emitter, method_name)
                await method(*args, **kwargs)
            except Exception as e:
                print(f"Event emission error: {e}")
    
    def emit_sync_event(self, method_name, *args, **kwargs):
        """Helper to emit events synchronously if sync emitter is available"""
        if hasattr(self, 'sync_emitter') and self.sync_emitter:
            try:
                method = getattr(self.sync_emitter, method_name)
                method(*args, **kwargs)
            except Exception as e:
                print(f"Sync event emission error: {e}")
    
    def reset_game_stats(self):
        """Reset game statistics for a new run"""
        self.current_enemy_count = 0
        self.total_enemies_defeated = 0
        self.loot_history = []
        self.current_floor = 1
        self.current_room = 1
    
    def update_settings(self, new_settings):
        """Update game settings"""
        self.settings.update(new_settings)
    
    def play_multiple_games(self, mode, run_count):
        """Play multiple games with automatic energy claiming if needed"""
        print(colored(f"\n🔄 Starting {mode.capitalize()} Mode for ", 'green', attrs=['bold']), end="")
        sys.stdout.flush()

        if run_count == 1:
            print(colored("a single run...", 'green', attrs=['bold']))
        elif run_count == -1:
            print(colored("unlimited runs until energy depletes...", 'green', attrs=['bold']))
        else:
            print(colored(f"{run_count} runs...", 'green', attrs=['bold']))
        sys.stdout.flush()

        # Set energy threshold based on mode
        if mode == "gigus":
            energy_threshold = 240
        elif mode == "underhaul":
            energy_threshold = 50
        else:
            energy_threshold = 50

        run_stats = []
        successful_runs = 0
        run_attempt = 1
        continue_running = True

        while continue_running:
            # Display run counter
            print(colored(f"\n{'='*60}", 'cyan'))
            sys.stdout.flush()
            if run_count == -1:
                print(colored(f"🏃 STARTING RUN #{run_attempt} (UNLIMITED MODE) 🏃".center(60), 'cyan', attrs=['bold']))
            else:
                print(colored(f"🏃 STARTING RUN {run_attempt}/{run_count} 🏃".center(60), 'cyan', attrs=['bold']))
            sys.stdout.flush()
            print(colored(f"{'='*60}\n", 'cyan'))
            sys.stdout.flush()

            # Claim energy if this isn't the first run
            if run_attempt > 1:
                print(colored("🔋 Proactively claiming energy before starting next run...", 'yellow'))
                sys.stdout.flush()
                try:
                    from claim_manager import claim_resources
                    results = claim_resources(self.api_manager.headers, "energy", energy_threshold)
                    print(results)
                    sys.stdout.flush()
                except Exception as e:
                    print(f"⚠️ Error claiming energy: {e}")
                    sys.stdout.flush()

            try:
                self._try_start_run(mode)
                successful_runs += 1
            except Exception as e:
                print(colored(f"❌ Error on run #{run_attempt}: {e}", 'red'))
                sys.stdout.flush()

            run_attempt += 1

            if run_count != -1 and run_attempt > run_count:
                continue_running = False

        self._display_session_summary()
        sys.stdout.flush()
    
    def _try_start_run(self, mode):
        """Attempt to start a dungeon run and return result"""
        # Select dungeon ID based on mode
        if mode == "normal":
            dungeon_id = 1
        elif mode == "gigus":
            dungeon_id = 2
        elif mode == "underhaul":
            dungeon_id = 3
        else:
            dungeon_id = 1
        
        try:
            # Start the run
            start_response = self.api_manager.send_action("start_run", "", dungeon_id, self.api_manager.DEFAULT_ACTION_DATA)
            
            if not start_response or not start_response.get("success"):
                error_msg = "Unknown error"
                if start_response and start_response.get("message"):
                    error_msg = start_response.get("message")
                return {"success": False, "error": error_msg}
            
            action_token = start_response.get("actionToken")
            run = start_response["data"]["run"]
            
            return {
                "success": True,
                "action_token": action_token,
                "run": run
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _display_session_summary(self, run_stats=None, successful_runs=0, attempted_runs=0):
        """Display summary statistics for a multi-run session"""
        if not run_stats:
            print(colored("\n❌ No successful runs to summarize.", 'red'))
            return
        
        print(colored("\n" + "="*60, 'cyan'))
        print(colored("🎮 MULTI-RUN SESSION SUMMARY 🎮".center(60), 'cyan', attrs=['bold']))
        print(colored("="*60 + "\n", 'cyan'))
        
        print(colored("SESSION OVERVIEW:", 'yellow', attrs=['bold']))
        print(colored(f"  Successful Runs: {successful_runs}/{attempted_runs}", 'cyan'))
        
        # Calculate aggregate stats
        total_enemies = sum(run["enemies_defeated"] for run in run_stats)
        avg_enemies = total_enemies / len(run_stats) if run_stats else 0
        best_run = max(run_stats, key=lambda x: (x["final_floor"], x["final_room"], x["enemies_defeated"]))
        
        print(colored(f"  Total Enemies Defeated: {total_enemies}", 'green'))
        print(colored(f"  Average Enemies per Run: {avg_enemies:.1f}", 'green'))
        
        print(colored("\nBEST RUN:", 'yellow', attrs=['bold']))
        print(colored(f"  Mode: {best_run['mode'].capitalize()}", 'cyan'))
        print(colored(f"  Enemies Defeated: {best_run['enemies_defeated']}", 'green'))
        print(colored(f"  Final Location: Floor {best_run['final_floor']}, Room {best_run['final_room']}", 'magenta'))
        
        if best_run.get("loot_history"):
            print(colored("\nLoot from Best Run:", 'yellow', attrs=['bold']))
            for i, loot in enumerate(best_run["loot_history"]):
                print(colored(f"  {i+1}. {loot}", 'cyan'))
    
    def play_game(self, mode, action_token=None, initial_run=None):
        """Main game loop for playing the dungeon crawler (modified for multi-run)"""
        import asyncio
        
        self.reset_game_stats()
        
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
            
            # Emit or print start message
            start_message = f"🚀 Starting {mode.capitalize()} Mode dungeon run..."
            if self.event_emitter:
                asyncio.create_task(self.emit_event('emit_info', start_message))
            else:
                print(colored(start_message, 'green', attrs=['bold']))
            
            # Start the run
            start_response = self.api_manager.send_action("start_run", "", start_dungeon_id, self.api_manager.DEFAULT_ACTION_DATA)
            if not start_response or not start_response.get("success"):
                error_msg = "Failed to start dungeon run."
                if self.event_emitter:
                    asyncio.create_task(self.emit_event('emit_error', error_msg))
                else:
                    print(colored(f"❌ {error_msg}", 'red'))
                return None
                
            action_token = start_response.get("actionToken")
            run = start_response["data"]["run"]
            
            success_msg = "Successfully started dungeon run!"
            if self.event_emitter:
                asyncio.create_task(self.emit_event('emit_success', success_msg))
            else:
                print(colored(f"✅ {success_msg}", 'green'))
        else:
            # We already have a token and run from multi-run
            run = initial_run
            success_msg = "Successfully started dungeon run!"
            if self.event_emitter:
                asyncio.create_task(self.emit_event('emit_success', success_msg))
            else:
                print(colored(f"✅ {success_msg}", 'green'))
        
        game_over = False
        
        # Main game loop
        while not game_over:
            if run.get("lootPhase"):
                # Handle loot phase
                print(colored("\n" + "-"*60, 'cyan'))
                print(colored(f"🎁 LOOT PHASE - Floor {self.current_floor} Room {self.current_room}".center(60), 'cyan'))
                print(colored("-"*60, 'cyan'))
                
                loot_options = run.get("lootOptions", [])
                if not loot_options:
                    print(colored("⚠️ Loot phase active but no loot options available.", 'yellow'))
                    break
                
                # Display loot options
                print(colored("\nAvailable Loot Options:", 'yellow'))
                for i, option in enumerate(loot_options):
                    boon_type = option.get("boonTypeString", "Unknown")
                    val1 = option.get("selectedVal1", 0)
                    val2 = option.get("selectedVal2", 0)
                    description = self.loot_manager.get_loot_description(boon_type, val1, val2)
                    print(colored(f"  [{i+1}] {description}", 'yellow'))
                
                # Extract state data
                state_data, player_charges, enemy_charges = self.state_manager.extract_game_state(run)
                self.ui_manager.display_player_status(state_data)
                
                # Get player and enemy stats
                player_stats = self.state_manager.get_player_stats(run)
                enemy_stats = self.state_manager.get_enemy_stats(run)
                
                # Select best loot option - NOW WITH FLOOR AND ROOM INFORMATION
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
                print(colored(f"✅ Selected loot: {description}", 'green'))
                self.loot_history.append(description)
                
                # Use the action that was assigned to the loot option
                loot_action = best_loot.get("action")
                if not loot_action:
                    print(colored("⚠️ Warning: No action set for loot option, defaulting to loot_two", 'yellow'))
                    loot_action = "loot_two"  # fallback if action key is not set
                else:
                    print(colored(f"Executing loot action: {loot_action}", 'green'))
                
                loot_response = self.api_manager.send_action(loot_action, action_token, dungeon_id, self.api_manager.DEFAULT_ACTION_DATA)
                
                if not loot_response or not loot_response.get("success"):
                    print(colored("❌ Failed to choose loot option.", 'red'))
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
                    print(colored(f"\n🏆 ADVANCING TO FLOOR {self.current_floor}! 🏆\n", 'yellow', attrs=['bold']))
            else:
                # Combat phase
                self.emit_sync_event('emit_phase_change', 'combat', self.current_floor, self.current_room)
                
                # For CLI mode, also print
                if not hasattr(self, 'sync_emitter') or not self.sync_emitter:
                    print(colored("\n" + "-"*60, 'cyan'))
                    print(colored(f"⚔️ COMBAT - Floor {self.current_floor} Room {self.current_room}".center(60), 'cyan'))
                    print(colored("-"*60, 'cyan'))
                
                # Extract state data
                state_data, player_charges, enemy_charges = self.state_manager.extract_game_state(run)
                
                # Display enemy details
                enemy = run["players"][1]
                enemy_name = enemy.get("name", "Unknown Enemy")
                
                # Emit enemy info for web UI
                self.emit_sync_event('emit_enemy_info', enemy_name, 
                                    state_data['enemy_health'], state_data['enemy_max_health'],
                                    state_data['enemy_shield'], state_data['enemy_max_shield'])
                
                # For CLI mode
                if not hasattr(self, 'sync_emitter') or not self.sync_emitter:
                    print(colored(f"\nEnemy: {enemy_name}", 'red'))
                    print(colored(f"  ❤️ Health: {state_data['enemy_health']}/{state_data['enemy_max_health']}", 'red'))
                    print(colored(f"  🛡️ Shield: {state_data['enemy_shield']}/{state_data['enemy_max_shield']}", 'blue'))
                
                # Emit player status for web UI
                self.emit_sync_event('emit_player_status', 
                                    state_data['player_health'], state_data['player_max_health'],
                                    state_data['player_shield'], state_data['player_max_shield'])
                
                # Emit move charges for web UI
                self.emit_sync_event('emit_move_charges', 
                                    player_charges['rock'], player_charges['paper'], player_charges['scissor'])
                
                # For CLI mode, display player status
                if not hasattr(self, 'sync_emitter') or not self.sync_emitter:
                    self.ui_manager.display_player_status(state_data)
                    self.ui_manager.display_move_charges(player_charges)
                
                # Get base player stats
                player_stats = self.state_manager.get_player_stats(run)
                
                # Apply equipment bonuses
                equipment = run["players"][0].get("equipment", [])
                player_stats, state_data = self.state_manager.apply_equipment_bonuses(player_stats, state_data, equipment)
                
                # Emit move stats for web UI
                self.emit_sync_event('emit_move_stats', player_stats)
                
                # For CLI mode, display move stats
                if not hasattr(self, 'sync_emitter') or not self.sync_emitter:
                    self.ui_manager.display_move_stats(player_stats)
                
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
                self.emit_sync_event('emit_move_calculation', "Calculating best move...")
                if not hasattr(self, 'sync_emitter') or not self.sync_emitter:
                    print(colored("\nCalculating best move...", 'green'))
                    
                best_move = get_best_action(api_data, iterations=self.settings['mcts_iterations'])
                move_symbol = "🪨" if best_move == "rock" else "📄" if best_move == "paper" else "✂️"
                
                # Emit selected move for web UI
                self.emit_sync_event('emit_move_selected', best_move, move_symbol)
                
                # For CLI mode
                if not hasattr(self, 'sync_emitter') or not self.sync_emitter:
                    print(colored(f"Selected move: {move_symbol} {best_move.upper()}", 'green', attrs=['bold']))
                
                # Execute move
                move_response = self.api_manager.send_action(best_move, action_token, dungeon_id, self.api_manager.DEFAULT_ACTION_DATA)
                if not move_response or not move_response.get("success"):
                    print(colored(f"❌ Failed to execute move: {best_move}", 'red'))
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
                    
                    print(colored(f"\nRound Result: {result_symbol} {result}", 'yellow', attrs=['bold']))
                    print(colored(f"  Player: {p_symbol} {player_move.upper()} vs Enemy: {e_symbol} {enemy_move.upper()}", 'yellow'))
                
                new_token = move_response.get("actionToken")
                if new_token and new_token != action_token:
                    action_token = new_token
                
                run = move_response["data"]["run"]
                
                # Check if enemy was defeated
                new_state, _, _ = self.state_manager.extract_game_state(run)
                if new_state["enemy_health"] <= 0:
                    self.total_enemies_defeated += 1
                    print(colored(f"\n🏆 ENEMY DEFEATED! (Total: {self.total_enemies_defeated})", 'green', attrs=['bold']))
                
                if run["players"][0]["health"]["current"] <= 0:
                    print(colored("\n💀 Game Over: Player's health reached 0.", 'red', attrs=['bold']))
                    print(colored(f"Total enemies defeated: {self.total_enemies_defeated}", 'yellow'))
                    print(colored(f"Made it to Floor {self.current_floor}, Room {self.current_room}", 'yellow'))
                    game_over = True
                
                time.sleep(1)
        
        # End of game summary for single run (skipped for multi-run)
        if not action_token or action_token == "":  # This indicates it's a standalone run
            print(colored("\n" + "="*60, 'green'))
            print(colored("🎮 GAME SUMMARY 🎮".center(60), 'green', attrs=['bold']))
            print(colored("="*60, 'green'))
            print(colored(f"Mode: {mode.capitalize()}", 'cyan'))
            print(colored(f"Total Enemies Defeated: {self.total_enemies_defeated}", 'green'))
            print(colored(f"Final Location: Floor {self.current_floor}, Room {self.current_room}", 'magenta'))
            
            if self.loot_history:
                print(colored("\nUnique Loot Acquired:", 'yellow', attrs=['bold']))
                for i, loot in enumerate(self.loot_history):
                    print(colored(f"  {i+1}. {loot}", 'cyan'))
        
        return {
            "mode": mode,
            "enemies_defeated": self.total_enemies_defeated,
            "final_floor": self.current_floor,
            "final_room": self.current_room,
            "loot_history": self.loot_history.copy()
        }