import json
import time
import asyncio
import threading
from typing import Dict, List, Optional, Any
import logging

from fishing_manager import FishingManager
from fishing_api import FishingApiManager

class WebFishingManager:
    """Main controller for web-based fishing game sessions"""
    
    def __init__(self, jwt_token: str, event_emitter, logger=None):
        self.jwt_token = jwt_token
        self.event_emitter = event_emitter
        self.logger = logger or logging.getLogger(__name__)
        
        # Initialize fishing components
        self.fishing_manager = FishingManager(logger=self.logger)
        self.fishing_api = FishingApiManager(token=jwt_token, logger=self.logger)
        
        # Game state tracking
        self.is_fishing_active = False
        self.current_action_token = None
        self.current_node_id = "2"  # Default fishing node
        self.turn_count = 0
        self.max_turns = 50  # Maximum turns per fishing session
        
        # Session statistics
        self.session_stats = {
            'session_start_time': time.time(),
            'turns_played': 0,
            'fish_caught': 0,
            'damage_dealt': 0,
            'cards_played': 0,
            'fishing_active': False
        }

    def start_fishing_session(self, run_continuously: bool = False):
        """Start a fishing session"""
        self.logger.info("🎣 Starting web fishing session...")
        
        try:
            # Emit session start event
            self._emit_event("fishing_session", "start", "🎣 Starting fishing session...")
            
            # Check if fishing is available
            if not self.fishing_api.check_fishing_availability():
                self._emit_event("fishing_session", "error", "❌ Fishing is not available right now")
                return
            
            # Try to get existing game state first
            player_address = self._get_player_address_from_token()
            if player_address:
                existing_state = self.fishing_api.get_fishing_state(player_address)
                if existing_state and self._has_active_game(existing_state):
                    self.logger.info("🐟 Found existing fishing game, continuing...")
                    self._emit_event("fishing_session", "continue", "🐟 Continuing existing fishing game...")
                    self._continue_existing_game(existing_state)
                    return
            
            # Start new fishing game
            self._start_new_fishing_game()
            
            if run_continuously:
                self._run_continuous_fishing()
                
        except Exception as e:
            self.logger.error(f"❌ Error starting fishing session: {e}")
            self._emit_event("fishing_session", "error", f"❌ Error starting fishing: {str(e)}")

    def stop_fishing_session(self):
        """Stop the current fishing session"""
        self.logger.info("🛑 Stopping fishing session...")
        self.is_fishing_active = False
        self.session_stats['fishing_active'] = False
        self._emit_event("fishing_session", "stop", "🛑 Fishing session stopped")

    def play_turn(self):
        """Play a single fishing turn"""
        if not self.is_fishing_active or not self.current_action_token:
            self._emit_event("fishing_turn", "error", "❌ No active fishing session")
            return
        
        try:
            self.turn_count += 1
            self.logger.info(f"🎯 Playing fishing turn {self.turn_count}")
            
            # Get card recommendation from fishing manager
            recommended_card = self.fishing_manager.get_best_card_recommendation()
            
            if recommended_card is None:
                self._emit_event("fishing_turn", "error", "❌ No suitable card found to play")
                self._check_game_end()
                return
            
            # Emit card selection event (no card names, just IDs)
            self._emit_event("fishing_turn", "card_selected", 
                           f"🎯 Selected card: {recommended_card}")
            
            # Play the card
            play_response = self.fishing_api.play_fishing_cards(
                action_token=self.current_action_token,
                card_indices=[recommended_card],
                node_id=self.current_node_id
            )
            
            if play_response and play_response.get('success'):
                self.session_stats['cards_played'] += 1
                self.session_stats['turns_played'] += 1
                
                # Process the response
                self._process_play_response(play_response, recommended_card)
                
                # Update action token if provided
                if 'actionToken' in play_response:
                    self.current_action_token = play_response['actionToken']
                
                # Check for loot phase
                if self._check_for_loot_phase(play_response):
                    self._handle_loot_phase(play_response)
                
                # Check if game should continue
                if not self.fishing_manager.should_continue_fishing():
                    self._check_game_end()
                
            else:
                error_msg = play_response.get('message', 'Unknown error') if play_response else 'No response'
                self._emit_event("fishing_turn", "error", f"❌ Failed to play card: {error_msg}")
                self._check_game_end()
                
        except Exception as e:
            self.logger.error(f"❌ Error playing turn: {e}")
            self._emit_event("fishing_turn", "error", f"❌ Error playing turn: {str(e)}")

    def get_current_stats(self) -> Dict:
        """Get current session statistics"""
        stats = dict(self.session_stats)
        if self.fishing_manager.current_state:
            stats.update(self.fishing_manager.get_fishing_stats())
        stats['turn_count'] = self.turn_count
        stats['is_active'] = self.is_fishing_active
        return stats

    def _emit_event(self, event_type: str, category: str, message: str):
        """Emit an event through the event emitter"""
        try:
            self.event_emitter.emit(event_type, category, message)
        except Exception as e:
            self.logger.error(f"❌ Error emitting event: {e}")

    def _start_new_fishing_game(self):
        """Start a new fishing game"""
        self.logger.info("🎣 Starting new fishing game...")
        
        try:
            # Start fishing game
            start_response = self.fishing_api.start_fishing_game(node_id=self.current_node_id)
            
            if start_response and start_response.get('success'):
                self.logger.info("✅ Successfully started fishing game!")
                self._emit_event("fishing_game", "start", "✅ Fishing game started successfully!")
                
                # Extract action token
                self.current_action_token = start_response.get('actionToken')
                
                # Load initial game state
                if self._load_initial_game_state(start_response):
                    self.is_fishing_active = True
                    self.session_stats['fishing_active'] = True
                    self.turn_count = 0
                    
                    self._emit_event("fishing_game", "ready", "🎮 Ready to start fishing turns!")
                    self._emit_fishing_stats()
                else:
                    self._emit_event("fishing_game", "error", "❌ Failed to load initial game state")
            else:
                error_msg = start_response.get('message', 'Unknown error') if start_response else 'No response'
                self._emit_event("fishing_game", "error", f"❌ Failed to start fishing game: {error_msg}")
                
        except Exception as e:
            self.logger.error(f"❌ Error starting new fishing game: {e}")
            self._emit_event("fishing_game", "error", f"❌ Error starting game: {str(e)}")

    def _load_initial_game_state(self, start_response: Dict) -> bool:
        """Load initial game state from start response"""
        try:
            # Try different possible response structures
            game_state = None
            
            if 'data' in start_response and 'gameState' in start_response['data']:
                game_state = start_response['data']['gameState']
            elif 'data' in start_response and 'doc' in start_response['data']:
                game_state = start_response['data']['doc']
            elif 'gameState' in start_response:
                game_state = start_response['gameState']
            
            if game_state and 'data' in game_state:
                # Load card data
                if 'deckCardData' in game_state['data']:
                    self.fishing_manager.load_card_data(game_state['data']['deckCardData'])
                    self.logger.info("✅ Card data loaded")
                
                # Update game state
                self.fishing_manager.update_game_state(game_state)
                self.logger.info("✅ Game state loaded")
                return True
            else:
                self.logger.warning("⚠️ No valid game state found in start response")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ Error loading initial game state: {e}")
            return False

    def _emit_fishing_stats(self):
        """Emit current fishing statistics"""
        try:
            stats = self.fishing_manager.get_fishing_stats()
            stats.update(self.session_stats)
            stats['turn_count'] = self.turn_count
            
            self.event_emitter.emit("fishing_stats", "update", json.dumps(stats))
        except Exception as e:
            self.logger.error(f"❌ Error emitting fishing stats: {e}")

    def _process_play_response(self, response: Dict, card_id: int):
        """Process the response from playing a card"""
        try:
            # Update game state if provided
            if 'data' in response and 'gameState' in response['data']:
                game_state = response['data']['gameState']
                
                # Store previous state for comparison
                prev_fish_hp = self.fishing_manager.current_state.fish_hp if self.fishing_manager.current_state else 0
                
                # Update state
                self.fishing_manager.update_game_state(game_state)
                
                # Calculate damage dealt or fish healing
                new_fish_hp = self.fishing_manager.current_state.fish_hp if self.fishing_manager.current_state else 0
                hp_change = prev_fish_hp - new_fish_hp
                
                if hp_change > 0:
                    self.session_stats['damage_dealt'] += hp_change
                    self._emit_event("fishing_turn", "damage", f"⚔️ Dealt {hp_change} damage with card {card_id}!")
                elif hp_change < 0:
                    healing = abs(hp_change)
                    self._emit_event("fishing_turn", "heal", f"❤️ Fish healed {healing} HP (card {card_id} missed)")
                else:
                    self._emit_event("fishing_turn", "no_effect", f"⚪ No damage dealt with card {card_id}")
                
                # Check if fish was caught
                if new_fish_hp <= 0:
                    self.session_stats['fish_caught'] += 1
                    self._emit_event("fishing_turn", "fish_caught", f"🐟 Fish caught! Total fish: {self.session_stats['fish_caught']}")
                
                # Emit updated stats
                self._emit_fishing_stats()
            
        except Exception as e:
            self.logger.error(f"❌ Error processing play response: {e}")

    def _check_for_loot_phase(self, response: Dict) -> bool:
        """Check if response indicates a loot phase"""
        try:
            if 'data' in response and 'lootOptions' in response['data']:
                return len(response['data']['lootOptions']) > 0
            return False
        except:
            return False

    def _handle_loot_phase(self, response: Dict):
        """Handle loot selection phase"""
        try:
            loot_options = response['data']['lootOptions']
            
            if loot_options:
                # For simplicity, select the first loot option
                selected_loot = loot_options[0]['id']
                
                self._emit_event("fishing_loot", "selecting", f"🎁 Selecting loot card: {selected_loot}")
                
                loot_response = self.fishing_api.select_loot_card(
                    action_token=self.current_action_token,
                    card_id=selected_loot,
                    node_id=self.current_node_id
                )
                
                if loot_response and loot_response.get('success'):
                    self._emit_event("fishing_loot", "selected", f"✅ Loot card {selected_loot} selected successfully!")
                    
                    # Update action token if provided
                    if 'actionToken' in loot_response:
                        self.current_action_token = loot_response['actionToken']
                        
                    # Update deck status - no longer base deck after adding loot
                    if self.fishing_manager.current_state:
                        self.fishing_manager.current_state.is_base_deck = False
                        self.logger.info("🃏 Deck expanded with loot card")
                else:
                    self._emit_event("fishing_loot", "error", "❌ Failed to select loot")
            
        except Exception as e:
            self.logger.error(f"❌ Error handling loot phase: {e}")
            self._emit_event("fishing_loot", "error", f"❌ Loot error: {str(e)}")

    def _continue_existing_game(self, state_data: Dict):
        """Continue an existing fishing game"""
        try:
            self.logger.info("🔄 Continuing existing fishing game...")
            
            # Extract action token from existing state
            if 'actionToken' in state_data:
                self.current_action_token = state_data['actionToken']
                self.logger.info(f"🔑 Found existing action token")
            
            # Load the existing game state
            if self._load_initial_game_state(state_data):
                self.is_fishing_active = True
                self.session_stats['fishing_active'] = True
                self._emit_event("fishing_game", "continue", "🔄 Continuing existing fishing game!")
                self._emit_fishing_stats()
            else:
                self._emit_event("fishing_game", "error", "❌ Failed to load existing game state")
                
        except Exception as e:
            self.logger.error(f"❌ Error continuing existing game: {e}")
            self._emit_event("fishing_game", "error", f"❌ Error continuing game: {str(e)}")

    def _has_active_game(self, state_data: Dict) -> bool:
        """Check if there's an active fishing game"""
        try:
            # Check if there's an action token and game state
            has_token = 'actionToken' in state_data and state_data['actionToken']
            has_game_state = 'data' in state_data or 'gameState' in state_data
            
            return has_token and has_game_state
        except:
            return False

    def _get_player_address_from_token(self) -> Optional[str]:
        """Extract player address from JWT token"""
        try:
            # For now, return None to skip existing game check
            # This could be implemented to decode JWT token in the future
            return None
        except:
            return None

    def _check_game_end(self):
        """Check if the game should end"""
        self.is_fishing_active = False
        self.session_stats['fishing_active'] = False
        self._emit_event("fishing_session", "end", "🔚 Fishing session ended")

    def _run_continuous_fishing(self):
        """Run fishing continuously until stopped"""
        while self.is_fishing_active and self.turn_count < self.max_turns:
            self.play_turn()
            if self.is_fishing_active:
                time.sleep(2)  # Wait 2 seconds between turns
                
        if self.turn_count >= self.max_turns:
            self.logger.info(f"🔚 Reached maximum turns ({self.max_turns})")
            self._emit_event("fishing_session", "end", f"🔚 Reached maximum turns ({self.max_turns})")
            self.stop_fishing_session() 