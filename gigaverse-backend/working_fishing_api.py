import requests
import json
import time
from typing import Dict, List, Optional, Any
from termcolor import colored

class FishingApiManager:
    """Handles API calls for the fishing game mode"""
    
    def __init__(self, token: str = None, base_url: str = "https://gigaverse.io/api", logger=None):
        self.base_url = base_url
        self.logger = logger
        self.session = requests.Session()
        
        # Set up headers including authentication
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        # Add authorization header if token provided
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        self.session.headers.update(headers)
        
        # Fishing-specific endpoints
        self.fishing_action_endpoint = f"{base_url}/fishing/action"
        self.fishing_state_endpoint = f"{base_url}/fishing/state"
        
    def get_fishing_state(self, player_address: str) -> Optional[Dict]:
        """Get current fishing game state for a player"""
        try:
            url = f"{self.fishing_state_endpoint}/{player_address}"
            
            if self.logger:
                self.logger.log_general_info(f"📡 Getting fishing state for player {player_address}")
            
            response = self.session.get(url, timeout=30)
            
            if self.logger:
                self.logger.log_general_info(f"📥 Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if self.logger:
                    self.logger.log_general_info("✅ Successfully retrieved fishing state")
                    # Log the full response to see what we're getting
                    self.logger.log_general_info(f"📥 Full fishing state response: {data}")
                    # Check specifically for action token
                    if 'actionToken' in data:
                        self.logger.log_general_info(f"🔑 Action token found in state: {data['actionToken'][:20]}...")
                    else:
                        self.logger.log_error("⚠️ No action token in fishing state response!")
                return data
            else:
                response_text = response.text if hasattr(response, 'text') else 'No response text'
                if self.logger:
                    self.logger.log_error(f"❌ Failed to get fishing state: {response.status_code}")
                    self.logger.log_error(f"📥 Response text: {response_text}")
                return None
                
        except requests.exceptions.RequestException as e:
            if self.logger:
                self.logger.log_error(f"❌ Network error getting fishing state: {e}")
            return None
        except Exception as e:
            if self.logger:
                self.logger.log_error(f"❌ Unexpected error getting fishing state: {e}")
            return None

    def start_fishing_game(self, node_id: str = "2", cards: List[int] = None) -> Optional[Dict]:
        """Start a new fishing game"""
        try:
            if cards is None:
                cards = []
                
            payload = {
                "action": "start_run",
                "actionToken": "",
                "data": {
                    "cards": cards,
                    "nodeId": node_id
                }
            }
            
            if self.logger:
                self.logger.log_general_info(f"🎣 Starting fishing game with node {node_id}")
                self.logger.log_general_info(f"📤 Request payload: {payload}")
                
            response = self.session.post(
                self.fishing_action_endpoint,
                json=payload,
                timeout=30
            )
            
            if self.logger:
                self.logger.log_general_info(f"📥 Response status: {response.status_code}")
                
            if response.status_code == 200:
                data = response.json()
                if self.logger:
                    self.logger.log_general_info(f"📥 Response data: {data}")
                    
                if data.get("success"):
                    if self.logger:
                        self.logger.log_general_info("✅ Successfully started fishing game")
                        action_token = data.get('actionToken')
                        if action_token:
                            self.logger.log_general_info(f"🔑 Action token received: {str(action_token)[:20]}...")
                        else:
                            self.logger.log_error("⚠️ No action token in successful response!")
                    return data
                else:
                    if self.logger:
                        self.logger.log_error(f"❌ Failed to start fishing game: {data.get('message', 'Unknown error')}")
                    return None
            else:
                response_text = response.text if hasattr(response, 'text') else 'No response text'
                if self.logger:
                    self.logger.log_error(f"❌ HTTP error starting fishing game: {response.status_code}")
                    self.logger.log_error(f"📥 Response text: {response_text}")
                return None
                
        except requests.exceptions.RequestException as e:
            if self.logger:
                self.logger.log_error(f"❌ Network error starting fishing game: {e}")
            return None
        except Exception as e:
            if self.logger:
                self.logger.log_error(f"❌ Unexpected error starting fishing game: {e}")
            return None

    def play_fishing_cards(self, action_token: str, card_indices: List[int], node_id: str = "") -> Optional[Dict]:
        """Play fishing cards during the game"""
        try:
            payload = {
                "action": "play_cards",
                "actionToken": action_token,
                "data": {
                    "cards": card_indices,
                    "nodeId": node_id
                }
            }
            
            if self.logger:
                self.logger.log_general_info(f"🎯 Playing fishing cards: {card_indices}")
                
            response = self.session.post(
                self.fishing_action_endpoint,
                json=payload,
                timeout=30
            )
            
            if self.logger:
                self.logger.log_general_info(f"📥 Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if self.logger:
                    self.logger.log_general_info(f"📥 Play cards response: {data}")
                if data.get("success"):
                    if self.logger:
                        self.logger.log_general_info("✅ Successfully played fishing cards")
                    return data
                else:
                    if self.logger:
                        self.logger.log_error(f"❌ Failed to play fishing cards: {data.get('message', 'Unknown error')}")
                    return None
            else:
                if self.logger:
                    self.logger.log_error(f"❌ HTTP error playing fishing cards: {response.status_code}")
                    try:
                        error_data = response.json()
                        self.logger.log_error(f"📥 Error response: {error_data}")
                    except:
                        self.logger.log_error(f"📥 Non-JSON error response: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            if self.logger:
                self.logger.log_error(f"❌ Network error playing fishing cards: {e}")
            return None
        except Exception as e:
            if self.logger:
                self.logger.log_error(f"❌ Unexpected error playing fishing cards: {e}")
            return None

    def select_loot_card(self, action_token: str, card_id: int, node_id: str = "") -> Optional[Dict]:
        """Select a card from the loot phase after catching a fish"""
        try:
            payload = {
                "action": "loot",
                "actionToken": action_token,
                "data": {
                    "cards": [card_id],
                    "nodeId": node_id
                }
            }
            
            if self.logger:
                self.logger.log_general_info(f"🎴 Selecting loot card: {card_id}")
                
            response = self.session.post(
                self.fishing_action_endpoint,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    if self.logger:
                        self.logger.log_general_info("✅ Successfully selected loot card")
                    return data
                else:
                    if self.logger:
                        self.logger.log_error(f"❌ Failed to select loot card: {data.get('message', 'Unknown error')}")
                    return None
            else:
                if self.logger:
                    self.logger.log_error(f"❌ HTTP error selecting loot card: {response.status_code}")
                return None
                
        except requests.exceptions.RequestException as e:
            if self.logger:
                self.logger.log_error(f"❌ Network error selecting loot card: {e}")
            return None
        except Exception as e:
            if self.logger:
                self.logger.log_error(f"❌ Unexpected error selecting loot card: {e}")
            return None

    def get_action_token_for_existing_game(self, node_id: str = "2") -> Optional[str]:
        """Try to get an action token for an existing active game"""
        try:
            # Try making a start_run call to see if it returns an action token for existing game
            payload = {
                "action": "start_run",
                "actionToken": "",
                "data": {
                    "cards": [],
                    "nodeId": node_id
                }
            }
            
            if self.logger:
                self.logger.log_general_info("🔑 Attempting to get action token for existing game...")
                self.logger.log_general_info(f"📤 Request payload: {payload}")
                
            response = self.session.post(
                self.fishing_action_endpoint,
                json=payload,
                timeout=30
            )
            
            if self.logger:
                self.logger.log_general_info(f"📥 Response status: {response.status_code}")
                
            if response.status_code == 200:
                data = response.json()
                if self.logger:
                    self.logger.log_general_info(f"📥 Response data: {data}")
                    
                if data.get("success"):
                    action_token = data.get('actionToken')
                    if action_token:
                        if self.logger:
                            self.logger.log_general_info(f"✅ Got action token for existing game: {str(action_token)[:20]}...")
                        return str(action_token)  # Convert to string in case it's a number
                    else:
                        if self.logger:
                            self.logger.log_error("⚠️ No action token in successful response!")
                        return None
                else:
                    # Even failed responses might contain action tokens for existing games
                    action_token = data.get('actionToken')
                    if action_token:
                        if self.logger:
                            self.logger.log_general_info(f"✅ Got action token from failed response (existing game): {str(action_token)[:20]}...")
                        return str(action_token)  # Convert to string in case it's a number
                    else:
                        if self.logger:
                            self.logger.log_error(f"❌ Failed to get action token: {data.get('message', 'Unknown error')}")
                        return None
            elif response.status_code == 400:
                # 400 errors often mean there's already an active game - check for action token
                try:
                    data = response.json()
                    if self.logger:
                        self.logger.log_general_info(f"📥 400 Response data: {data}")
                    
                    action_token = data.get('actionToken')
                    if action_token:
                        if self.logger:
                            self.logger.log_general_info(f"✅ Got action token from 400 response (existing game): {str(action_token)[:20]}...")
                        return str(action_token)  # Convert to string in case it's a number
                    else:
                        if self.logger:
                            self.logger.log_error(f"❌ 400 error without action token: {data.get('message', 'Unknown error')}")
                        return None
                except:
                    if self.logger:
                        self.logger.log_error(f"❌ Could not parse 400 response as JSON")
                    return None
            else:
                response_text = response.text if hasattr(response, 'text') else 'No response text'
                if self.logger:
                    self.logger.log_error(f"❌ HTTP error getting action token: {response.status_code}")
                    self.logger.log_error(f"📥 Response text: {response_text}")
                return None
                
        except requests.exceptions.RequestException as e:
            if self.logger:
                self.logger.log_error(f"❌ Network error getting action token: {e}")
            return None
        except Exception as e:
            if self.logger:
                self.logger.log_error(f"❌ Unexpected error getting action token: {e}")
            return None

    def get_player_address(self) -> Optional[str]:
        """Get the player's wallet address from existing session/config"""
        # This will need to be integrated with the existing authentication system
        # For now, using the address from the fishing data
        return "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"

    def validate_action_token(self) -> bool:
        """Validate that we have a valid action token"""
        # This would integrate with existing session management
        return True

    def handle_fishing_events(self, events: List[Dict]) -> Dict[str, Any]:
        """Process fishing game events from API response"""
        processed_events = {
            'fish_moved': False,
            'card_played': False,
            'fish_hp_changed': 0,
            'player_hp_changed': 0,
            'game_ended': False
        }
        
        for event in events:
            event_type = event.get('type', '')
            
            if event_type == 'FISH_MOVED':
                processed_events['fish_moved'] = True
                if self.logger:
                    self.logger.log_general_info(f"🐟 Fish moved to position {event.get('value', 'unknown')}")
                    
            elif event_type == 'CARD_PLAYED':
                processed_events['card_played'] = True
                result = event.get('data', {}).get('result', 0)
                if self.logger:
                    self.logger.log_general_info(f"🎯 Card played with result: {result}")
                    
            elif event_type == 'FISH_HP_DIFF':
                hp_change = event.get('value', 0)
                processed_events['fish_hp_changed'] = hp_change
                if self.logger:
                    if hp_change > 0:
                        self.logger.log_general_info(f"💚 Fish healed for {hp_change} HP")
                    else:
                        self.logger.log_general_info(f"⚔️ Fish took {abs(hp_change)} damage")
                        
            elif event_type == 'PLAYER_HP_DIFF':
                hp_change = event.get('value', 0)
                processed_events['player_hp_changed'] = hp_change
                if self.logger:
                    if hp_change > 0:
                        self.logger.log_general_info(f"💚 Player healed for {hp_change} HP")
                    else:
                        self.logger.log_general_info(f"💔 Player took {abs(hp_change)} damage")
                        
            elif event_type == 'GAME_END':
                processed_events['game_ended'] = True
                if self.logger:
                    self.logger.log_general_info("🏁 Fishing game ended")
        
        return processed_events

    def retry_request(self, request_func, max_retries: int = 3, delay: float = 1.0) -> Optional[Dict]:
        """Retry a request with exponential backoff"""
        for attempt in range(max_retries):
            try:
                result = request_func()
                if result:
                    return result
                    
            except Exception as e:
                if self.logger:
                    self.logger.log_error(f"⚠️ Request attempt {attempt + 1} failed: {e}")
                    
            if attempt < max_retries - 1:
                time.sleep(delay * (2 ** attempt))  # Exponential backoff
                
        if self.logger:
            self.logger.log_error(f"❌ All {max_retries} request attempts failed")
        return None

    def log_api_call(self, endpoint: str, payload: Dict, response: Optional[Dict]) -> None:
        """Log API call details for debugging"""
        if not self.logger:
            return
            
        self.logger.log_general_info(f"🔍 API Call: {endpoint}")
        self.logger.log_general_info(f"📤 Payload: {json.dumps(payload, indent=2)}")
        
        if response:
            self.logger.log_general_info(f"📥 Response: {json.dumps(response, indent=2)}")
        else:
            self.logger.log_general_info("📥 Response: None (failed)")

    def check_fishing_availability(self) -> bool:
        """Check if fishing is available for the player"""
        try:
            player_address = self.get_player_address()
            if not player_address:
                return False
                
            state = self.get_fishing_state(player_address)
            if not state:
                return False
                
            # Check if player has fishing attempts remaining
            # This logic would need to be adjusted based on actual game rules
            return True
            
        except Exception as e:
            if self.logger:
                self.logger.log_error(f"❌ Error checking fishing availability: {e}")
            return False

    def get_fishing_session_info(self) -> Dict[str, Any]:
        """Get information about the current fishing session"""
        try:
            player_address = self.get_player_address()
            if not player_address:
                return {}
                
            state = self.get_fishing_state(player_address)
            if not state:
                return {}
                
            game_state = state.get('gameState', {})
            
            return {
                'player_address': player_address,
                'max_per_day': state.get('maxPerDay', 0),
                'max_per_day_juiced': state.get('maxPerDayJuiced', 0),
                'skill_level': state.get('skillLevel', 0),
                'day': game_state.get('data', {}).get('day', 0),
                'week': game_state.get('data', {}).get('week', 0),
                'has_active_game': game_state.get('data', {}).get('fishHp', 0) > 0
            }
            
        except Exception as e:
            if self.logger:
                self.logger.log_error(f"❌ Error getting fishing session info: {e}")
            return {} 