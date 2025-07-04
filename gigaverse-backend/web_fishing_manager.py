import json
import time
import asyncio
import threading
from typing import Dict, List, Optional, Any
import logging

from fishing_manager import FishingManager
from fishing_api import FishingApiManager
from game_event_emitter import GameEventEmitter

class WebFishingManager:
    """Main controller for web-based fishing game sessions"""
    
    def __init__(self, fishing_api: FishingApiManager, action_token: str, game_data: Dict, 
                 event_emitter: GameEventEmitter, logger: logging.Logger):
        self.fishing_api = fishing_api
        self.action_token = action_token
        self.game_data = game_data
        self.event_emitter = event_emitter
        self.logger = logger
        
        # Initialize the fishing manager with game data
        self.fishing_manager = FishingManager(logger=logger)
        
        # Load game state from provided data
        self.fishing_manager.load_game_state(game_data)
        
        # Fishing session state
        self.is_fishing_active = False
        self.max_turns = 50
        self.turn_count = 0
        self.fishing_thread = None

    def start_fishing_session(self, run_continuously: bool = False):
        """Start a fishing session with the provided game data"""
        self.logger.info("🎣 Starting web fishing session...")
        
        try:
            # Emit session start event
            self._emit_event("fishing_session", "start", "🎣 Starting fishing session...")
            
            # Load card data from game data
            card_data = self.game_data.get('deckCardData', [])
            if card_data:
                self.fishing_manager.load_card_data(card_data)
                self.logger.info("✅ Card data loaded")
            else:
                self.logger.error("❌ No card data found in game data")
                self._emit_event("fishing_session", "error", "❌ No card data available")
                return
                
            # Extract game state info
            player_hp = self.game_data.get('playerHp', 0)
            player_max_hp = self.game_data.get('playerMaxHp', 0)
            fish_hp = self.game_data.get('fishHp', 0)
            fish_max_hp = self.game_data.get('fishMaxHp', 0)
            fish_position = self.game_data.get('fishPosition', [2, 2])
            previous_fish_position = self.game_data.get('previousFishPosition', [2, 2])
            current_hand = self.game_data.get('hand', [])
            
            self.logger.info("✅ Game state loaded")
            
            # Log current game state
            self._emit_event("fishing_game", "continue", f"🎮 Game state: Player {player_hp}/{player_max_hp} HP, Fish {fish_hp}/{fish_max_hp} HP")
            self._emit_event("fishing_stats", "update", {
                "playerHp": player_hp,
                "playerMaxHp": player_max_hp,
                "fishHp": fish_hp,
                "fishMaxHp": fish_max_hp,
                "fishPosition": fish_position,
                "hand": current_hand
            })
            
            if run_continuously:
                self.is_fishing_active = True
                self.turn_count = 0
                self.fishing_thread = threading.Thread(target=self._run_continuous_fishing, daemon=True)
                self.fishing_thread.start()
                self.logger.info("🔄 Continuous fishing started")
            else:
                self.play_turn()
                
        except Exception as e:
            self.logger.error(f"❌ Error starting fishing session: {e}")
            self._emit_event("fishing_session", "error", f"❌ Error starting fishing session: {e}")

    def stop_fishing_session(self):
        """Stop the fishing session"""
        self.is_fishing_active = False
        self.logger.info("🛑 Fishing session stopped")
        self._emit_event("fishing_session", "end", "🛑 Fishing session stopped")

    def play_turn(self):
        """Play a single fishing turn"""
        if not self.is_fishing_active:
            return
            
        self.turn_count += 1
        self.logger.info(f"🎯 Playing fishing turn {self.turn_count}")
        
        try:
            # Get card recommendation from fishing manager
            recommended_card = self.fishing_manager.get_card_recommendation()
            
            if recommended_card is None:
                self.logger.error("❌ No card recommendation available")
                self._emit_event("fishing_turn", "error", "❌ No card recommendation available")
                self.stop_fishing_session()
                return
                
            # Convert card ID to hand index
            if self.fishing_manager.current_state and self.fishing_manager.current_state.hand:
                try:
                    hand_index = self.fishing_manager.current_state.hand.index(recommended_card)
                    self.logger.info(f"🎯 Playing card ID {recommended_card} at hand index {hand_index}")
                    self._emit_event("fishing_turn", "card_selected", f"🎯 Selected card ID {recommended_card} (hand index {hand_index})")
                    
                    # Play the card via API using hand index
                    response = self.fishing_api.play_fishing_cards([hand_index])
                except ValueError:
                    self.logger.error(f"❌ Card ID {recommended_card} not found in hand {self.fishing_manager.current_state.hand}")
                    self._emit_event("fishing_turn", "error", f"❌ Card ID {recommended_card} not in hand")
                    self.stop_fishing_session()
                    return
            else:
                self.logger.error("❌ No hand information available")
                self._emit_event("fishing_turn", "error", "❌ No hand information available")
                self.stop_fishing_session()
                return
            
            if response and response.get('success'):
                self.logger.info("✅ Card played successfully")
                
                # Update game state from response
                new_game_data = response.get('data', {}).get('doc', {}).get('data', {})
                if new_game_data:
                    self.game_data = new_game_data
                    self.fishing_manager.load_game_state(new_game_data)
                    
                    # Emit updated stats
                    self._emit_event("fishing_stats", "update", {
                        "playerHp": new_game_data.get('playerHp', 0),
                        "playerMaxHp": new_game_data.get('playerMaxHp', 0),
                        "fishHp": new_game_data.get('fishHp', 0),
                        "fishMaxHp": new_game_data.get('fishMaxHp', 0),
                        "fishPosition": new_game_data.get('fishPosition', [2, 2]),
                        "hand": new_game_data.get('hand', [])
                    })
                    
                    # Check if game is complete
                    if new_game_data.get('fishHp', 0) <= 0:
                        self.logger.info("🏆 Fish defeated! Game complete!")
                        self._emit_event("fishing_session", "complete", "🏆 Fish defeated! Game complete!")
                        self.stop_fishing_session()
                    elif new_game_data.get('playerHp', 0) <= 0:
                        self.logger.info("💀 Player defeated! Game over!")
                        self._emit_event("fishing_session", "complete", "💀 Player defeated! Game over!")
                        self.stop_fishing_session()
                else:
                    self.logger.warning("⚠️ No game data in response")
                    
            else:
                error_msg = response.get('message', 'Unknown error') if response else 'No response from API'
                self.logger.error(f"❌ Failed to play card: {error_msg}")
                self._emit_event("fishing_turn", "error", f"❌ Failed to play card: {error_msg}")
                self.stop_fishing_session()
                
        except Exception as e:
            self.logger.error(f"❌ Error playing turn: {e}")
            self._emit_event("fishing_turn", "error", f"❌ Error playing turn: {e}")
            self.stop_fishing_session()

    def get_current_stats(self) -> Dict:
        """Get current session statistics"""
        stats = dict(self.session_stats)
        if self.fishing_manager.current_state:
            stats.update(self.fishing_manager.get_fishing_stats())
        stats['turn_count'] = self.turn_count
        stats['is_active'] = self.is_fishing_active
        return stats

    def _emit_event(self, event_type: str, category: str, message: str):
        """Emit event to WebSocket clients"""
        try:
            self.event_emitter.emit(event_type, category, message)
        except Exception as e:
            self.logger.error(f"❌ Error emitting event: {e}")

    def _run_continuous_fishing(self):
        """Run fishing continuously with 5-second MCTS thinking delay"""
        while self.is_fishing_active and self.turn_count < self.max_turns:
            self.play_turn()
            if self.is_fishing_active:
                # 5-second MCTS thinking delay
                self.logger.info("🧠 MCTS thinking... (5 seconds)")
                time.sleep(5)
                
        if self.turn_count >= self.max_turns:
            self.logger.info(f"🔚 Reached maximum turns ({self.max_turns})")
            self._emit_event("fishing_session", "end", f"🔚 Reached maximum turns ({self.max_turns})")
            self.stop_fishing_session()

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
            # Handle different API response formats for loot detection
            loot_options = None
            if 'data' in response:
                if 'doc' in response['data'] and 'data' in response['data']['doc']:
                    # Full API response format: {data: {doc: {data: {lootOptions: [...]}}}}
                    doc_data = response['data']['doc']['data']
                    loot_options = doc_data.get('lootOptions', [])
                elif 'lootOptions' in response['data']:
                    # Direct format: {data: {lootOptions: [...]}}
                    loot_options = response['data']['lootOptions']
            
            return loot_options and len(loot_options) > 0
        except:
            return False

    def _handle_loot_phase(self, response: Dict):
        """Handle loot selection phase"""
        try:
            # Handle different API response formats for loot options
            loot_options = None
            if 'data' in response:
                if 'doc' in response['data'] and 'data' in response['data']['doc']:
                    # Full API response format: {data: {doc: {data: {lootOptions: [...]}}}}
                    doc_data = response['data']['doc']['data']
                    loot_options = doc_data.get('lootOptions', [])
                elif 'lootOptions' in response['data']:
                    # Direct format: {data: {lootOptions: [...]}}
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
            # For now, return the known wallet address from the fishing data
            # This could be implemented to decode JWT token in the future
            return "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"
        except:
            return "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"

    def _check_game_end(self):
        """Check if the game should end"""
        self.is_fishing_active = False
        self.session_stats['fishing_active'] = False
        self._emit_event("fishing_session", "end", "🔚 Fishing session ended")

    def _emit_fishing_stats(self):
        """Emit current fishing statistics"""
        try:
            stats = self.fishing_manager.get_fishing_stats()
            stats.update(self.session_stats)
            stats['turn_count'] = self.turn_count
            
            self.event_emitter.emit("fishing_stats", "update", json.dumps(stats))
        except Exception as e:
            self.logger.error(f"❌ Error emitting fishing stats: {e}") 