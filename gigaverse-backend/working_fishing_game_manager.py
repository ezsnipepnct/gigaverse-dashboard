import json
import time
from typing import Dict, List, Optional, Tuple
from termcolor import colored

from fishing_manager import FishingManager
from fishing_api import FishingApiManager
from fishing_loot_manager import FishingLootManager
from fishing_logger import FishingLogger

class FishingGameManager:
    """Main controller for the fishing game mode"""
    
    def __init__(self, ui_manager, token: str = None, logger=None):
        self.ui_manager = ui_manager
        self.logger = logger
        self.fishing_manager = FishingManager(logger)
        self.fishing_api = FishingApiManager(token=token, logger=logger)
        self.loot_manager = FishingLootManager(logger)
        
        # Game session tracking
        self.session_stats = {
            'games_played': 0,
            'games_won': 0,
            'total_fish_caught': 0,
            'fish_caught': [],  # Track individual fish with details
            'total_damage_dealt': 0,
            'session_start_time': time.time()
        }

    def play_fishing_session(self, run_count=1):
        """Main entry point for fishing game session (single or multiple runs)"""
        try:
            if run_count == 1:
                # Single fishing session
                self._play_single_fishing_session()
            else:
                # Multiple fishing sessions
                self.play_multiple_fishing_sessions(run_count)
                
        except KeyboardInterrupt:
            print(colored("\n🎣 Fishing session interrupted by user", 'yellow'))
        except Exception as e:
            if self.logger:
                self.logger.log_error(f"❌ Error in fishing session: {e}")
            print(colored(f"❌ Error during fishing: {e}", 'red'))
    
    def _play_single_fishing_session(self):
        """Play a single fishing session"""
        print(colored("\n🎣 Welcome to Fishing Mode! 🎣", 'cyan', attrs=['bold']))
        
        # Check if fishing is available
        if not self.fishing_api.check_fishing_availability():
            print(colored("❌ Fishing is not available right now", 'red'))
            return
        
        # Get session info
        session_info = self.fishing_api.get_fishing_session_info()
        self._display_fishing_intro(session_info)
        
        # Display persistent deck collection
        self.display_persistent_deck_summary()
        
        # Check for existing active game
        player_address = self.fishing_api.get_player_address()
        current_state = self.fishing_api.get_fishing_state(player_address)
        
        if current_state and self._has_active_game(current_state):
            print(colored("🐟 Found an active fishing game!", 'yellow'))
            if self._prompt_continue_game():
                self._continue_existing_game(current_state)
                return
        
        # Start new fishing session
        self._start_new_fishing_session()

    def _display_fishing_intro(self, session_info: Dict):
        """Display fishing introduction and session info"""
        print(colored("\n" + "="*60, 'cyan'))
        print(colored("🌊 FISHING SESSION INFO 🌊".center(60), 'cyan', attrs=['bold']))
        print(colored("="*60, 'cyan'))
        
        if session_info:
            print(colored(f"👤 Player: {session_info.get('player_address', 'Unknown')[:10]}...", 'white'))
            print(colored(f"🎣 Skill Level: {session_info.get('skill_level', 0)}", 'magenta'))
            print(colored(f"📅 Day {session_info.get('day', 0)}, Week {session_info.get('week', 0)}", 'yellow'))
            print(colored(f"🎯 Max attempts per day: {session_info.get('max_per_day', 0)}", 'cyan'))
            
            if session_info.get('has_active_game'):
                print(colored("🐟 Active game detected!", 'green'))
            else:
                print(colored("🎣 Ready to start fishing!", 'blue'))
        
        print(colored("="*60 + "\n", 'cyan'))

    def _has_active_game(self, state_data: Dict) -> bool:
        """Check if there's an active fishing game"""
        try:
            game_state = state_data.get('gameState', {}).get('data', {})
            fish_hp = game_state.get('fishHp', 0)
            player_hp = game_state.get('playerHp', 0)
            
            return fish_hp > 0 and player_hp > 0
        except:
            return False

    def _prompt_continue_game(self) -> bool:
        """Ask user if they want to continue existing game"""
        import questionary
        
        try:
            return questionary.confirm(
                "Continue the existing fishing game?",
                default=True
            ).ask()
        except:
            return False

    def _continue_existing_game(self, state_data: Dict):
        """Continue an existing fishing game"""
        print(colored("🎣 Continuing existing fishing game...", 'cyan'))
        
        # Load game state
        game_data = state_data['gameState']
        self.fishing_manager.load_card_data(game_data['data']['deckCardData'])
        self.fishing_manager.update_game_state(game_data)
        
        # Try to extract action token from state if available
        action_token = state_data.get('actionToken')
        if action_token:
            print(colored(f"🔑 Found action token in existing game state: {str(action_token)[:20]}...", 'green'))
        else:
            print(colored("⚠️ No action token in existing game state. Attempting to get fresh token...", 'yellow'))
            
            # Try to get an action token for the existing game
            node_id = game_data.get('ID_CID', '2')  # Use the node ID from the game state
            action_token = self.fishing_api.get_action_token_for_existing_game(node_id)
            
            if action_token:
                print(colored(f"✅ Got fresh action token: {str(action_token)[:20]}...", 'green'))
            else:
                print(colored("❌ Failed to get action token. Game may be unplayable.", 'red'))
                if self.logger:
                    self.logger.log_error("❌ Could not obtain action token for existing game")
        
        # Start game loop with existing state
        self._run_fishing_game_loop(action_token=action_token)

    def _start_new_fishing_session(self):
        """Start a new fishing game session"""
        print(colored("🎣 Starting new fishing session...", 'cyan'))
        
        try:
            # First, check if fishing is available
            if not self.fishing_api.check_fishing_availability():
                print(colored("❌ Fishing is not available right now", 'red'))
                return
            
            # Try to start a real fishing game
            print(colored("🎯 Attempting to start real fishing game...", 'cyan'))
            
            # Start fishing game (this would normally require node selection)
            # For now, we'll use node_id="2" as default fishing node
            start_response = self.fishing_api.start_fishing_game(node_id="2")
            
            if start_response and start_response.get('success'):
                print(colored("✅ Successfully started fishing game!", 'green'))
                action_token = start_response.get('actionToken')
                
                # Load the initial game state
                if 'data' in start_response and 'gameState' in start_response['data']:
                    game_state = start_response['data']['gameState']
                    print(colored("🔄 Loading initial game state...", 'cyan'))
                    
                    # Load card data and game state into fishing manager
                    if 'data' in game_state and 'deckCardData' in game_state['data']:
                        self.fishing_manager.load_card_data(game_state['data']['deckCardData'])
                        print(colored("✅ Card data loaded", 'green'))
                    
                    self.fishing_manager.update_game_state(game_state)
                    print(colored("✅ Game state loaded", 'green'))
                elif 'data' in start_response and 'doc' in start_response['data']:
                    game_state = start_response['data']['doc']
                    print(colored("🔄 Loading initial game state from doc...", 'cyan'))
                    
                    # Load card data and game state into fishing manager
                    if 'data' in game_state and 'deckCardData' in game_state['data']:
                        self.fishing_manager.load_card_data(game_state['data']['deckCardData'])
                        print(colored("✅ Card data loaded", 'green'))
                    
                    self.fishing_manager.update_game_state(game_state)
                    print(colored("✅ Game state loaded", 'green'))
                else:
                    print(colored("⚠️ No game state found in start response", 'yellow'))
                    if self.logger:
                        self.logger.log_general_info(f"📥 Start response keys: {list(start_response.keys()) if start_response else 'None'}")
                        if start_response and 'data' in start_response:
                            self.logger.log_general_info(f"📥 Start response data keys: {list(start_response['data'].keys())}")
                    print(colored(f"🔍 Debug: Response keys = {list(start_response.keys()) if start_response else 'None'}", 'yellow'))
                    
                    # Fallback: Try to get the current fishing state from API
                    print(colored("🔄 Attempting to fetch initial state from API...", 'yellow'))
                    player_address = self.fishing_api.get_player_address()
                    if player_address:
                        current_state = self.fishing_api.get_fishing_state(player_address)
                        if current_state and current_state.get('gameState'):
                            print(colored("✅ Successfully retrieved initial state from API", 'green'))
                            game_data = current_state['gameState']
                            
                            # Load card data and game state
                            if 'data' in game_data and 'deckCardData' in game_data['data']:
                                self.fishing_manager.load_card_data(game_data['data']['deckCardData'])
                                print(colored("✅ Card data loaded from API state", 'green'))
                            
                            self.fishing_manager.update_game_state(game_data)
                            print(colored("✅ Game state loaded from API", 'green'))
                        else:
                            print(colored("❌ Failed to get initial state from API", 'red'))
                
                # Run the actual fishing game loop
                self._run_fishing_game_loop(action_token)
                
            else:
                # Failed to start real game - check for existing active game
                print(colored("⚠️ Could not start new fishing game. Checking for active game...", 'yellow'))
                
                player_address = self.fishing_api.get_player_address()
                if player_address:
                    current_state = self.fishing_api.get_fishing_state(player_address)
                    
                    if current_state and self._has_active_game(current_state):
                        print(colored("🐟 Found active fishing game! Continuing...", 'green'))
                        self._continue_existing_game(current_state)
                        return
                
                # Last resort: Fall back to demo mode
                print(colored("⚠️ No active game found. Running demo mode to avoid wasting energy.", 'yellow'))
                self._run_demo_mode()
                
        except Exception as e:
            if self.logger:
                self.logger.log_error(f"❌ Error starting fishing session: {e}")
            print(colored(f"❌ Error starting fishing session: {e}", 'red'))
            
            # Fall back to demo mode on error
            print(colored("⚠️ Falling back to demo mode due to error.", 'yellow'))
            self._run_demo_mode()
    
    def _run_demo_mode(self):
        """Run demo fishing session using pre-loaded data"""
        print(colored("🎮 Running fishing demo with saved game data", 'green'))
        
        # Load demo data from the fishing_data.json file
        try:
            with open('Fishing_data.json', 'r') as f:
                demo_data = json.load(f)
            
            self._run_fishing_demo(demo_data)
            
        except FileNotFoundError:
            print(colored("❌ Demo data not found. Cannot proceed.", 'red'))
            return
        except Exception as e:
            if self.logger:
                self.logger.log_error(f"❌ Error loading demo data: {e}")
            print(colored(f"❌ Error loading demo data: {e}", 'red'))

    def _run_fishing_demo(self, demo_data: Dict):
        """Run a fishing demo using pre-loaded data"""
        print(colored("🎮 Running fishing demo with real game data", 'green'))
        
        # Load the demo game state
        game_state = demo_data['gameState']
        self.fishing_manager.load_card_data(game_state['data']['deckCardData'])
        self.fishing_manager.update_game_state(game_state)
        
        # Display initial state
        self._display_fishing_game_state()
        
        # Run demo turns
        turn_count = 0
        # Force at least one turn for demonstration, regardless of normal conditions
        max_demo_turns = 3
        while turn_count < max_demo_turns and (turn_count == 0 or self.fishing_manager.should_continue_fishing()):
            turn_count += 1
            print(colored(f"\n🎣 === DEMO TURN {turn_count} ===", 'cyan', attrs=['bold']))
            
            # Get AI recommendation using MCTS
            print(colored("🧠 Running MCTS analysis for optimal card selection...", 'yellow'))
            recommended_card = self.fishing_manager.get_best_card_recommendation(use_mcts=True, mcts_iterations=3000)
            
            if recommended_card is None:
                print(colored("❌ No cards available to play", 'red'))
                break
            
            # Display the recommended move
            card_name = self.fishing_manager.available_cards[recommended_card].name
            print(colored(f"🤖 AI Recommendation: Play {card_name}", 'green'))
            
            # Simulate the turn (without actually making API calls)
            self._simulate_fishing_turn(recommended_card, turn_count)
            
            # Update display
            self._display_fishing_game_state()
            
            # Brief pause for demo effect
            time.sleep(2)
        
        # Demo complete
        print(colored("\n🎣 Fishing demo completed!", 'cyan', attrs=['bold']))
        print(colored("🎮 In real mode, this would continue until fish is caught or game ends", 'yellow'))
        
        # Simulate loot phase
        print(colored("\n🎣 Simulating successful fish catch...", 'cyan'))
        self._simulate_loot_phase(demo_data)
        
        # Analyze fishing performance
        self.fishing_manager.analyze_fishing_performance()
        
        # Save logs
        self.fishing_manager.save_fishing_logs()

    def _simulate_fishing_turn(self, card_id: int, turn_number: int = 1):
        """Simulate a fishing turn for demo purposes"""
        if not self.fishing_manager.current_state:
            return
        
        card = self.fishing_manager.available_cards[card_id]
        
        # Get fish position before move
        fish_pos_before = self.fishing_manager.convert_position_to_grid(
            self.fishing_manager.current_state.fish_position
        )
        
        # Simulate fish movement (random for demo)
        import random
        possible_positions = list(range(1, 10))
        new_fish_pos = random.choice(possible_positions)
        new_fish_xy = self.fishing_manager.convert_grid_to_position(new_fish_pos)
        
        # Check if card would hit the NEW position
        hit_zones = set(card.hit_zones + card.crit_zones)
        is_hit = new_fish_pos in hit_zones
        is_crit = new_fish_pos in card.crit_zones
        
        # Calculate damage
        if is_crit:
            damage = sum(effect['amount'] for effect in card.crit_effects if effect['type'] == 'FISH_HP')
            result_type = "crit"
        elif is_hit:
            damage = sum(effect['amount'] for effect in card.hit_effects if effect['type'] == 'FISH_HP')
            result_type = "hit"
        else:
            damage = sum(effect['amount'] for effect in card.miss_effects if effect['type'] == 'FISH_HP')
            result_type = "miss"
        
        # Prepare card data for logging
        card_data = {
            'id': card_id,
            'name': card.name,
            'mana_cost': card.mana_cost,
            'hit_zones': card.hit_zones,
            'crit_zones': card.crit_zones,
            'hit_damage': sum(effect['amount'] for effect in card.hit_effects if effect['type'] == 'FISH_HP'),
            'crit_damage': sum(effect['amount'] for effect in card.crit_effects if effect['type'] == 'FISH_HP'),
            'miss_penalty': sum(effect['amount'] for effect in card.miss_effects if effect['type'] == 'FISH_HP')
        }
        
        # Log the move BEFORE updating state
        self.fishing_manager.log_fishing_move(
            turn_number=turn_number,
            card_played=card_data,
            fish_pos_before=fish_pos_before,
            fish_pos_after=new_fish_pos,
            result_type=result_type,
            damage_dealt=damage
        )
        
        # Apply damage
        new_fish_hp = max(0, self.fishing_manager.current_state.fish_hp + damage)
        
        # Update state
        self.fishing_manager.current_state.fish_hp = new_fish_hp
        self.fishing_manager.current_state.previous_fish_position = self.fishing_manager.current_state.fish_position
        self.fishing_manager.current_state.fish_position = new_fish_xy
        
        # Remove card from hand (simulate)
        if card_id in self.fishing_manager.current_state.hand:
            self.fishing_manager.current_state.hand.remove(card_id)
            self.fishing_manager.current_state.discard.append(card_id)
        
        # Update movement history
        self.fishing_manager.fish_movement_history.append(new_fish_xy)
        
        # Display turn result
        events = {
            'fish_moved': True,
            'card_played': True,
            'fish_hp_changed': damage,
            'game_ended': new_fish_hp <= 0
        }
        
        self.ui_manager.display_fishing_turn_summary(events, card.name, result_type)

    def _display_fishing_game_state(self):
        """Display current fishing game state"""
        if not self.fishing_manager.current_state:
            return
        
        # Get session info
        session_info = self.fishing_api.get_fishing_session_info()
        
        # Display fishing stats
        self.ui_manager.display_fishing_stats(self.fishing_manager.current_state, session_info)
        
        # Analyze patterns and get predictions
        predicted_positions = self.fishing_manager.analyze_fish_movement_pattern()
        
        # Display pattern analysis
        if len(self.fishing_manager.fish_movement_history) >= 2:
            current_pos = self.fishing_manager.convert_position_to_grid(
                self.fishing_manager.fish_movement_history[-1]
            )
            previous_pos = self.fishing_manager.convert_position_to_grid(
                self.fishing_manager.fish_movement_history[-2]
            )
            pattern_type = self.fishing_manager._detect_movement_pattern(previous_pos, current_pos)
            
            self.ui_manager.display_fishing_pattern_analysis(
                self.fishing_manager.fish_movement_history,
                predicted_positions,
                pattern_type
            )
        
        # Display fishing pond
        current_card = self.fishing_manager.get_best_card_recommendation()
        card_zones = []
        if current_card and current_card in self.fishing_manager.available_cards:
            card = self.fishing_manager.available_cards[current_card]
            card_zones = card.hit_zones + card.crit_zones
        
        self.ui_manager.display_fishing_pond(
            self.fishing_manager.current_state.fish_position,
            predicted_positions,
            card_zones
        )
        
        # Display cards in hand
        self.ui_manager.display_fishing_cards(
            self.fishing_manager.current_state.hand,
            self.fishing_manager.available_cards,
            predicted_positions
        )

    def _run_fishing_game_loop(self, action_token: str = None, skip_start: bool = False):
        """Main fishing game loop"""
        print(colored("🎣 Starting fishing game loop...", 'cyan'))
        
        # Track game stats
        game_won = False
        fish_caught = 0
        turns_played = 0
        
        # Display initial state
        print(colored("🎯 Initial Game State:", 'cyan', attrs=['bold']))
        self._display_fishing_game_state()
        
        # Game loop
        while self.fishing_manager.should_continue_fishing():
            try:
                turns_played += 1
                
                # Get player choice (for interactive mode) or AI recommendation
                print(colored("🧠 MCTS Strategic Analysis...", 'yellow'))
                card_choice = self.fishing_manager.get_best_card_recommendation(use_mcts=True, mcts_iterations=5000)
                
                if card_choice is None:
                    print(colored("❌ No valid moves available", 'red'))
                    break
                
                card_name = self.fishing_manager.available_cards[card_choice].name
                print(colored(f"🎯 Playing card: {card_name}", 'green'))
                
                # Convert card ID to hand index (API expects hand indices, not card IDs)
                hand_index = None
                if self.fishing_manager.current_state and self.fishing_manager.current_state.hand:
                    try:
                        hand_index = self.fishing_manager.current_state.hand.index(card_choice)
                        print(colored(f"🔄 Card ID {card_choice} → Hand index {hand_index}", 'yellow'))
                    except ValueError:
                        print(colored(f"❌ Card ID {card_choice} not found in hand {self.fishing_manager.current_state.hand}", 'red'))
                        break
                
                # Make real API call if we have action token
                if action_token and hand_index is not None:
                    print(colored("⚡ Making real API call...", 'cyan'))
                    play_response = self.fishing_api.play_fishing_cards(action_token, [hand_index])
                    
                    # Always try to extract action token from response (even from failed ones)
                    new_token = None
                    if play_response:
                        new_token = play_response.get('actionToken')
                        if new_token:
                            old_token = str(action_token)[:10] if action_token else "None"
                            new_token_str = str(new_token)
                            print(colored(f"🔄 Action token updated: {old_token}... → {new_token_str[:10]}...", 'yellow'))
                            action_token = new_token_str
                    
                    if play_response and play_response.get('success'):
                        print(colored("✅ Card played successfully!", 'green'))
                        
                        # Update game state from API response
                        if 'gameState' in play_response.get('data', {}):
                            game_data = play_response['data']['gameState']
                            self.fishing_manager.update_game_state(game_data)
                        elif 'doc' in play_response.get('data', {}):
                            game_data = play_response['data']['doc']
                            self.fishing_manager.update_game_state(game_data)
                        
                        # Display current state AFTER successful update
                        self._display_fishing_game_state()
                        
                        # Check for loot phase after playing cards
                        if self._check_for_loot_phase(play_response):
                            print(colored("🎁 Loot phase detected!", 'yellow'))
                            loot_response = self._handle_loot_phase(play_response, action_token)
                            
                            if loot_response:
                                fish_caught += 1
                                game_won = True
                                print(colored("🐟 Fish caught! Game won!", 'green', attrs=['bold']))
                                break
                        
                        # Check if game ended
                        if self.fishing_manager.current_state and self.fishing_manager.current_state.fish_hp <= 0:
                            fish_caught += 1
                            game_won = True
                            print(colored("🐟 Fish defeated! Game won!", 'green', attrs=['bold']))
                            
                            # Add generic fish details since we don't have loot data
                            fish_details = {
                                'name': 'Unknown Fish',
                                'rarity': 0,
                                'quality': 1
                            }
                            self.session_stats['fish_caught'].append(fish_details)
                            break
                        
                        # Brief pause between turns
                        time.sleep(1)
                        
                    else:
                        print(colored("❌ Failed to play card via API", 'red'))
                        if play_response:
                            print(colored(f"Error: {play_response.get('message', 'Unknown error')}", 'red'))
                            
                            # If we got an updated action token, try the same move again with the new token
                            if new_token:
                                print(colored("🔄 Retrying with updated action token...", 'yellow'))
                                retry_response = self.fishing_api.play_fishing_cards(action_token, [hand_index])
                                
                                if retry_response and retry_response.get('success'):
                                    print(colored("✅ Retry successful!", 'green'))
                                    
                                    # Update game state from retry response
                                    if 'gameState' in retry_response.get('data', {}):
                                        game_data = retry_response['data']['gameState']
                                        self.fishing_manager.update_game_state(game_data)
                                    elif 'doc' in retry_response.get('data', {}):
                                        game_data = retry_response['data']['doc']
                                        self.fishing_manager.update_game_state(game_data)
                                    
                                    # Display current state AFTER successful retry
                                    self._display_fishing_game_state()
                                    
                                    # Check for loot phase
                                    if self._check_for_loot_phase(retry_response):
                                        print(colored("🎁 Loot phase detected!", 'yellow'))
                                        loot_response = self._handle_loot_phase(retry_response, action_token)
                                        
                                        if loot_response:
                                            fish_caught += 1
                                            game_won = True
                                            print(colored("🐟 Fish caught! Game won!", 'green', attrs=['bold']))
                                            break
                                    
                                    # Brief pause between turns
                                    time.sleep(1)
                                    
                                    # Continue to next turn instead of breaking
                                    continue
                                else:
                                    print(colored("❌ Retry also failed", 'red'))
                        
                        # Don't break on API errors - check if game is still active
                        print(colored("🔄 Checking if game is still active after API error...", 'yellow'))
                        try:
                            player_address = self.fishing_api.get_player_address()
                            current_state = self.fishing_api.get_fishing_state(player_address)
                            
                            if current_state and self._has_active_game(current_state):
                                print(colored("✅ Game is still active! Refreshing state and continuing...", 'green'))
                                
                                # Update game state with fresh data
                                game_data = current_state['gameState']
                                self.fishing_manager.update_game_state(game_data)
                                
                                # Display refreshed state
                                self._display_fishing_game_state()
                                
                                # Try to get a fresh action token
                                fresh_token = self.fishing_api.get_action_token_for_existing_game(game_data.get('ID_CID', '2'))
                                if fresh_token:
                                    action_token = str(fresh_token)
                                    print(colored(f"🔑 Got fresh action token: {str(action_token)[:10]}...", 'green'))
                                
                                # Continue to next turn
                                continue
                            else:
                                print(colored("❌ Game is no longer active. Ending session.", 'red'))
                                break
                                
                        except Exception as refresh_error:
                            print(colored(f"❌ Error refreshing game state: {refresh_error}", 'red'))
                            break
                else:
                    print(colored("⚠️ No action token - cannot make real API calls", 'yellow'))
                    print(colored("🎯 This would normally play the card via API", 'yellow'))
                    break
                
            except KeyboardInterrupt:
                print(colored("\n🎣 Fishing interrupted by user", 'yellow'))
                break
            except Exception as e:
                if self.logger:
                    self.logger.log_error(f"❌ Error in fishing game loop: {e}")
                print(colored(f"❌ Error during fishing: {e}", 'red'))
                break
        
        # Update session stats
        self.session_stats['games_played'] += 1
        if game_won:
            self.session_stats['games_won'] += 1
        self.session_stats['total_fish_caught'] += fish_caught
        
        print(colored(f"\n🎣 Game completed! Turns: {turns_played}, Fish caught: {fish_caught}", 'cyan'))

    def get_session_stats(self) -> Dict:
        """Get current session statistics"""
        session_duration = time.time() - self.session_stats['session_start_time']
        
        return {
            **self.session_stats,
            'session_duration': session_duration,
            'win_rate': (self.session_stats['games_won'] / max(1, self.session_stats['games_played'])) * 100
        }
    
    def play_multiple_fishing_sessions(self, run_count):
        """Play multiple fishing sessions with automatic energy claiming if needed"""
        print(colored(f"\n🔄 Starting Fishing Mode for ", 'green', attrs=['bold']), end="")
        
        if run_count == 1:
            print(colored("a single session...", 'green', attrs=['bold']))
        elif run_count == -1:
            print(colored("unlimited sessions until energy depletes...", 'green', attrs=['bold']))
        else:
            print(colored(f"{run_count} sessions...", 'green', attrs=['bold']))
        
        # Fishing energy threshold - fishing typically uses 20 energy per session
        energy_threshold = 20
        
        run_stats = []
        successful_runs = 0
        run_attempt = 1
        continue_running = True
        
        # Display initial session info
        session_info = self.fishing_api.get_fishing_session_info()
        self._display_fishing_intro(session_info)
        self.display_persistent_deck_summary()
        
        while continue_running:
            # Display run counter
            if run_count == -1:  # Unlimited mode
                print(colored(f"\n{'='*60}", 'cyan'))
                print(colored(f"🎣 STARTING FISHING SESSION #{run_attempt} (UNLIMITED MODE) 🎣".center(60), 'cyan', attrs=['bold']))
                print(colored(f"{'='*60}\n", 'cyan'))
            else:
                print(colored(f"\n{'='*60}", 'cyan'))
                print(colored(f"🎣 STARTING FISHING SESSION {run_attempt}/{run_count} 🎣".center(60), 'cyan', attrs=['bold']))
                print(colored(f"{'='*60}\n", 'cyan'))
            
            # If this isn't the first run, proactively claim energy before starting
            if run_attempt > 1:
                print(colored("🔋 Proactively claiming energy before starting next fishing session...", 'yellow'))
                try:
                    from claim_manager import claim_resources
                    results = claim_resources(self.fishing_api.session.headers, "energy", energy_threshold)
                    
                    if "energy" in results and results["energy"]["total"] > 0:
                        print(colored(f"✅ Successfully claimed {results['energy']['total']} energy.", 'green'))
                    else:
                        print(colored("ℹ️ No energy was claimed. This might be fine if you already have sufficient energy.", 'yellow'))
                    
                    # Wait 3 seconds after claiming
                    print(colored("⏳ Waiting for 3 seconds after claiming energy...", 'cyan'))
                    time.sleep(3)
                except Exception as e:
                    print(colored(f"⚠️ Energy claiming failed: {e}. Continuing anyway...", 'yellow'))
            
            # Try to start a fishing session
            result = self._try_start_fishing_session()
            
            if result["success"]:
                # Session was started successfully
                session_stats = self._play_fishing_session_internal(result.get("action_token"), result.get("initial_state"))
                if session_stats:
                    run_stats.append(session_stats)
                    successful_runs += 1
                
                # Check if we should continue
                if run_count != -1 and run_attempt >= run_count:
                    continue_running = False
            else:
                # Session failed to start - try to claim energy and retry
                print(colored(f"❌ Failed to start fishing session. Error: {result['error']}", 'red'))
                print(colored("⚠️ Attempting to claim energy to see if that resolves the issue...", 'yellow'))
                
                # Try to claim energy
                try:
                    from claim_manager import claim_resources
                    results = claim_resources(self.fishing_api.session.headers, "energy", energy_threshold)
                    
                    if "energy" in results and results["energy"]["total"] > 0:
                        print(colored(f"✅ Successfully claimed {results['energy']['total']} energy. Retrying session...", 'green'))
                        
                        # Wait 3 seconds after claiming
                        print(colored("⏳ Waiting for 3 seconds after claiming energy...", 'cyan'))
                        time.sleep(3)
                        
                        # Try one more time
                        retry_result = self._try_start_fishing_session()
                        
                        if retry_result["success"]:
                            session_stats = self._play_fishing_session_internal(retry_result.get("action_token"), retry_result.get("initial_state"))
                            if session_stats:
                                run_stats.append(session_stats)
                                successful_runs += 1
                            
                            # Check if we should continue after this successful retry
                            if run_count != -1 and run_attempt >= run_count:
                                continue_running = False
                        else:
                            print(colored(f"❌ Failed to start fishing session even after claiming energy. Error: {retry_result['error']}", 'red'))
                            continue_running = False
                    else:
                        print(colored("❌ Could not claim sufficient energy. Stopping fishing sessions.", 'red'))
                        continue_running = False
                except Exception as e:
                    print(colored(f"❌ Error during energy claiming: {e}", 'red'))
                    continue_running = False
            
            run_attempt += 1
            
            if continue_running:
                # Add delay between runs
                print(colored("\n⏳ Waiting for 5 seconds before starting the next fishing session...", 'cyan'))
                time.sleep(5)
        
        # Display session summary when all runs complete
        self._display_fishing_session_summary(run_stats, successful_runs, run_attempt - 1)
        return run_stats
    
    def get_persistent_deck_info(self) -> Dict:
        """Get information about the player's persistent deck collection"""
        try:
            # In demo mode with multi-run, use simulated persistent deck
            if hasattr(self, '_demo_persistent_deck'):
                return {
                    'persistent_cards': self._demo_persistent_deck,
                    'total_cards': len(self._demo_persistent_deck),
                    'collection_source': 'demo_simulation'
                }
            
            # Try to get real persistent deck from API
            player_address = self.fishing_api.get_player_address()
            if not player_address:
                return {'persistent_cards': [], 'total_cards': 0, 'collection_source': 'no_address'}
            
            current_state = self.fishing_api.get_fishing_state(player_address)
            
            if current_state and current_state.get('dayDoc', {}).get('data', {}).get('deck'):
                persistent_cards = current_state['dayDoc']['data']['deck']
                return {
                    'persistent_cards': persistent_cards,
                    'total_cards': len(persistent_cards),
                    'collection_source': 'api'
                }
            else:
                # No persistent deck found - start with empty collection
                return {'persistent_cards': [], 'total_cards': 0, 'collection_source': 'empty'}
                
        except Exception as e:
            if self.logger:
                self.logger.log_error(f"❌ Error getting persistent deck info: {e}")
            return {'persistent_cards': [], 'total_cards': 0, 'collection_source': 'error'}
    
    def display_persistent_deck_summary(self):
        """Display a summary of the player's persistent card collection"""
        deck_info = self.get_persistent_deck_info()
        
        if not deck_info:
            print(colored("❌ Unable to retrieve persistent deck information", 'red'))
            return
        
        persistent_cards = deck_info.get('persistent_cards', [])
        total_collected = deck_info.get('total_cards', 0)
        
        print(colored("\n📦 PERSISTENT DECK COLLECTION", 'magenta', attrs=['bold']))
        print(colored("="*50, 'magenta'))
        
        if total_collected == 0:
            print(colored("📭 No cards collected yet", 'yellow'))
            print(colored("💡 Catch fish to earn new cards for your collection!", 'blue'))
        else:
            print(colored(f"🎴 Total cards collected: {total_collected}", 'green'))
            print(colored(f"🆔 Card IDs in collection: {persistent_cards}", 'cyan'))
            print(colored("💡 These cards are available for future fishing sessions", 'blue'))
        
        print(colored("="*50 + "\n", 'magenta'))
    
    def _check_for_loot_phase(self, api_response: Dict) -> bool:
        """Check if the API response indicates a loot phase"""
        try:
            data = api_response.get('data', {}).get('doc', {}).get('data', {})
            cards_to_add = data.get('cardsToAdd', [])
            return len(cards_to_add) > 0
        except:
            return False
    
    def _handle_loot_phase(self, api_response: Dict, action_token: str) -> Optional[Dict]:
        """Handle the loot phase after catching a fish"""
        try:
            data = api_response.get('data', {}).get('doc', {}).get('data', {})
            cards_to_add = data.get('cardsToAdd', [])
            
            if not cards_to_add:
                return None
            
            fish_caught = data.get('caughtFish', {})
            if fish_caught:
                fish_name = fish_caught.get('name', 'Unknown Fish')
                fish_rarity = fish_caught.get('rarity', 0)
                quality = fish_caught.get('quality', 0)
                
                print(colored(f"\n🎣 FISH CAUGHT! 🎣", 'green', attrs=['bold']))
                print(colored(f"🐟 {fish_name} (Rarity: {fish_rarity}, Quality: {quality})", 'cyan'))
                
                # Update session stats
                self.session_stats['total_fish_caught'] += 1
                self.session_stats['games_won'] += 1
                
                # Add fish details to the list
                fish_details = {
                    'name': fish_name,
                    'rarity': fish_rarity,
                    'quality': quality
                }
                self.session_stats['fish_caught'].append(fish_details)
            
            print(colored("\n🎁 LOOT PHASE ACTIVATED!", 'magenta', attrs=['bold']))
            print(colored("Choose one card to add to your persistent deck:", 'yellow'))
            print(colored("💡 New cards become available for future fishing sessions", 'blue'))
            
            # Get current persistent deck for analysis
            deck_info = self.get_persistent_deck_info()
            persistent_cards = deck_info.get('persistent_cards', [])
            
            # Display loot analysis
            self.loot_manager.display_loot_analysis(cards_to_add, data.get('deckCardData', []), persistent_cards)
            
            # Get optimal choice
            best_card_id = self.loot_manager.get_best_loot_choice(cards_to_add, data.get('deckCardData', []), persistent_cards)
            
            if best_card_id is None:
                print(colored("❌ No valid loot choices available", 'red'))
                return None
            
            # Make loot selection via API
            loot_response = self.fishing_api.select_loot_card(action_token, best_card_id)
            
            if loot_response and loot_response.get('success'):
                print(colored(f"✅ Successfully selected Card {best_card_id}!", 'green'))
                print(colored("🔄 Card added to persistent deck - available for next fishing session", 'cyan'))
                
                # Log the loot selection
                if self.logger:
                    self.logger.log_general_info(f"🎴 Loot selected: Card {best_card_id}")
                    self.logger.log_general_info(f"📦 Card {best_card_id} added to persistent deck")
                    
                return loot_response
            else:
                print(colored("❌ Failed to select loot card", 'red'))
                return None
                
        except Exception as e:
            if self.logger:
                self.logger.log_error(f"❌ Error handling loot phase: {e}")
            print(colored(f"❌ Error in loot phase: {e}", 'red'))
            return None
    
    def _simulate_loot_phase(self, demo_data: Dict):
        """Simulate loot phase for demo purposes"""
        # Create sample loot cards similar to the user's API call
        sample_loot_cards = [
            {
                "id": 48,
                "manaCost": 1,
                "hitZones": [7, 8, 9],
                "critZones": [4],
                "hitEffects": [{"type": "FISH_HP", "amount": 5}],
                "missEffects": [{"type": "FISH_HP", "amount": -3}],
                "critEffects": [{"type": "FISH_HP", "amount": 8}],
                "rarity": 0
            },
            {
                "id": 10,
                "manaCost": 1,
                "hitZones": [],
                "critZones": [5],
                "hitEffects": [],
                "missEffects": [{"type": "FISH_HP", "amount": -5}],
                "critEffects": [{"type": "FISH_HP", "amount": 10}],
                "rarity": 0
            },
            {
                "id": 51,
                "manaCost": 2,
                "hitZones": [1, 2, 3, 4, 6, 7, 8, 9],
                "critZones": [],
                "hitEffects": [{"type": "FISH_HP", "amount": 3}],
                "missEffects": [{"type": "FISH_HP", "amount": -2}],
                "critEffects": [],
                "rarity": 1
            }
        ]
        
        print(colored("\n🎁 DEMO LOOT PHASE ACTIVATED!", 'magenta', attrs=['bold']))
        print(colored("🐟 Simulating fish catch and loot selection...", 'cyan'))
        
        # Get persistent deck info for demo
        deck_info = self.get_persistent_deck_info()
        persistent_cards = deck_info.get('persistent_cards', [])
        
        # Display loot analysis
        current_deck = demo_data.get('gameState', {}).get('data', {}).get('deckCardData', [])
        self.loot_manager.display_loot_analysis(sample_loot_cards, current_deck, persistent_cards)
        
        # Get optimal choice
        best_card_id = self.loot_manager.get_best_loot_choice(sample_loot_cards, current_deck, persistent_cards)
        
        if best_card_id:
            print(colored(f"🤖 AI would select: Card {best_card_id}", 'green', attrs=['bold']))
            
            # In demo mode, simulate adding card to persistent collection
            if not hasattr(self, '_demo_persistent_deck'):
                self._demo_persistent_deck = persistent_cards.copy()
            
            if best_card_id not in self._demo_persistent_deck:
                self._demo_persistent_deck.append(best_card_id)
                print(colored(f"📦 Demo: Card {best_card_id} added to simulated persistent deck", 'cyan'))
                print(colored(f"🎴 Simulated collection now: {self._demo_persistent_deck}", 'blue'))
            
            # Log the demo loot selection
            if self.logger:
                self.logger.log_general_info(f"🎴 Demo loot choice: Card {best_card_id}")
                self.logger.log_general_info(f"📦 Demo persistent deck: {self._demo_persistent_deck}")
        else:
            print(colored("❌ Demo loot selection failed", 'red'))
    
    def _try_start_fishing_session(self):
        """Attempt to start a fishing session and return result"""
        try:
            # Check for existing active game first
            player_address = self.fishing_api.get_player_address()
            current_state = self.fishing_api.get_fishing_state(player_address)
            
            if current_state and self._has_active_game(current_state):
                print(colored("🐟 Found an active fishing game! Continuing existing session...", 'green'))
                return {
                    "success": True,
                    "action_token": None,  # Will get from game state
                    "initial_state": current_state
                }
            
            # No active game - try to start new one
            print(colored("🎯 No active game found. Attempting to start new fishing session...", 'cyan'))
            
            # Check if fishing is available
            if not self.fishing_api.check_fishing_availability():
                return {"success": False, "error": "Fishing is not available"}
            
            # Try to start real fishing game
            start_response = self.fishing_api.start_fishing_game(node_id="2")
            
            if start_response and start_response.get('success'):
                action_token = start_response.get('actionToken')
                print(colored(f"✅ Successfully started new fishing game! Token: {str(action_token)[:20]}...", 'green'))
                return {
                    "success": True,
                    "action_token": action_token,
                    "initial_state": None
                }
            else:
                error_msg = "Failed to start fishing game"
                if start_response and start_response.get('message'):
                    error_msg = start_response.get('message')
                return {"success": False, "error": error_msg}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _play_fishing_session_internal(self, action_token=None, initial_state=None):
        """Internal method to play a single fishing session (for multi-run)"""
        try:
            # Reset session stats for this individual session
            previous_games_played = self.session_stats['games_played']
            previous_games_won = self.session_stats['games_won']
            previous_fish_caught = self.session_stats['total_fish_caught']
            
            # If we have an initial state, continue existing game
            if initial_state:
                self._continue_existing_game(initial_state)
            else:
                # Start new session (demo mode)
                self._start_new_fishing_session()
            
            # Calculate stats for this session only
            games_played_this_session = self.session_stats['games_played'] - previous_games_played
            games_won_this_session = self.session_stats['games_won'] - previous_games_won
            fish_caught_this_session = self.session_stats['total_fish_caught'] - previous_fish_caught
            
            # Get fish caught in this session
            session_fish_details = self.session_stats['fish_caught'][previous_fish_caught:]
            
            # Return session stats
            return {
                "games_played": games_played_this_session,
                "games_won": games_won_this_session,
                "fish_caught": fish_caught_this_session,
                "fish_details": session_fish_details,
                "win_rate": (games_won_this_session / max(1, games_played_this_session)) * 100,
                "session_time": time.time()
            }
            
        except Exception as e:
            if self.logger:
                self.logger.log_error(f"❌ Error in fishing session: {e}")
            print(colored(f"❌ Error during fishing session: {e}", 'red'))
            return None
    
    def _display_fishing_session_summary(self, run_stats, successful_runs, attempted_runs):
        """Display summary statistics for a multi-run fishing session"""
        if not run_stats:
            print(colored("\n❌ No successful fishing sessions to summarize.", 'red'))
            return
        
        print(colored("\n" + "="*60, 'cyan'))
        print(colored("🎣 MULTI-FISHING SESSION SUMMARY 🎣".center(60), 'cyan', attrs=['bold']))
        print(colored("="*60 + "\n", 'cyan'))
        
        print(colored("SESSION OVERVIEW:", 'yellow', attrs=['bold']))
        print(colored(f"  Successful Sessions: {successful_runs}/{attempted_runs}", 'cyan'))
        
        # Calculate aggregate stats
        total_games = sum(session["games_played"] for session in run_stats)
        total_fish = sum(session["fish_caught"] for session in run_stats)
        total_wins = sum(session["games_won"] for session in run_stats)
        avg_fish_per_session = total_fish / len(run_stats) if run_stats else 0
        overall_win_rate = (total_wins / max(1, total_games)) * 100
        
        # Collect all fish caught
        all_fish_caught = []
        for session in run_stats:
            all_fish_caught.extend(session.get("fish_details", []))
        
        print(colored(f"  Total Games Played: {total_games}", 'green'))
        print(colored(f"  Total Fish Caught: {total_fish}", 'green'))
        print(colored(f"  Overall Win Rate: {overall_win_rate:.1f}%", 'green'))
        print(colored(f"  Average Fish per Session: {avg_fish_per_session:.1f}", 'green'))
        
        # Display all fish caught across sessions
        if all_fish_caught:
            print(colored("\n🐟 ALL FISH CAUGHT:", 'yellow', attrs=['bold']))
            for i, fish in enumerate(all_fish_caught, 1):
                rarity_color = 'white' if fish['rarity'] == 0 else 'green' if fish['rarity'] == 1 else 'yellow' if fish['rarity'] == 2 else 'magenta'
                print(colored(f"  {i}. {fish['name']} (Rarity: {fish['rarity']}, Quality: {fish['quality']})", rarity_color))
            
            # Show rarity breakdown
            rarity_counts = {}
            for fish in all_fish_caught:
                rarity = fish['rarity']
                rarity_counts[rarity] = rarity_counts.get(rarity, 0) + 1
            
            print(colored("\n📊 RARITY BREAKDOWN:", 'cyan', attrs=['bold']))
            for rarity in sorted(rarity_counts.keys()):
                count = rarity_counts[rarity]
                rarity_color = 'white' if rarity == 0 else 'green' if rarity == 1 else 'yellow' if rarity == 2 else 'magenta'
                rarity_name = 'Common' if rarity == 0 else 'Uncommon' if rarity == 1 else 'Rare' if rarity == 2 else f'Rarity {rarity}'
                print(colored(f"  {rarity_name}: {count} fish", rarity_color))
        
        # Find best session
        best_session = max(run_stats, key=lambda x: x["fish_caught"])
        
        print(colored("\nBEST SESSION:", 'yellow', attrs=['bold']))
        print(colored(f"  Fish Caught: {best_session['fish_caught']}", 'cyan'))
        print(colored(f"  Games Won: {best_session['games_won']}/{best_session['games_played']}", 'cyan'))
        print(colored(f"  Win Rate: {best_session['win_rate']:.1f}%", 'cyan'))
        
        # Show fish from best session
        if best_session.get('fish_details'):
            print(colored("  Fish Details:", 'cyan'))
            for fish in best_session['fish_details']:
                rarity_color = 'white' if fish['rarity'] == 0 else 'green' if fish['rarity'] == 1 else 'yellow' if fish['rarity'] == 2 else 'magenta'
                print(colored(f"    • {fish['name']} (Rarity: {fish['rarity']}, Quality: {fish['quality']})", rarity_color))
        
        # Display persistent deck progress
        deck_info = self.get_persistent_deck_info()
        persistent_cards = deck_info.get('persistent_cards', [])
        print(colored(f"\nPERSISTENT DECK PROGRESS:", 'yellow', attrs=['bold']))
        print(colored(f"  Total Cards Collected: {len(persistent_cards)}", 'magenta'))
        print(colored(f"  Card IDs: {persistent_cards}", 'magenta')) 