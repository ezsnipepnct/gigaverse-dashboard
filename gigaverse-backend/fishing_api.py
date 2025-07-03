import requests
import json
import time
from typing import Dict, List, Optional, Any
import logging

class FishingApiManager:
    """Handles API calls for the fishing game mode"""
    
    def __init__(self, token: str = None, base_url: str = "https://gigaverse.io/api", logger=None):
        self.base_url = base_url
        self.logger = logger or logging.getLogger(__name__)
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
            
            self.logger.info(f"📡 Getting fishing state for player {player_address}")
            
            response = self.session.get(url, timeout=30)
            
            self.logger.info(f"📥 Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.logger.info("✅ Successfully retrieved fishing state")
                self.logger.debug(f"📥 Full fishing state response: {data}")
                
                # Check specifically for action token
                if 'actionToken' in data:
                    self.logger.info(f"🔑 Action token found in state: {data['actionToken'][:20]}...")
                else:
                    self.logger.warning("⚠️ No action token in fishing state response!")
                return data
            else:
                response_text = response.text if hasattr(response, 'text') else 'No response text'
                self.logger.error(f"❌ Failed to get fishing state: {response.status_code}")
                self.logger.error(f"📥 Response text: {response_text}")
                return None
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"❌ Network error getting fishing state: {e}")
            return None
        except Exception as e:
            self.logger.error(f"❌ Unexpected error getting fishing state: {e}")
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
            
            self.logger.info(f"🎣 Starting fishing game with node {node_id}")
            self.logger.debug(f"📤 Request payload: {payload}")
                
            response = self.session.post(
                self.fishing_action_endpoint,
                json=payload,
                timeout=30
            )
            
            self.logger.info(f"📥 Response status: {response.status_code}")
                
            if response.status_code == 200:
                data = response.json()
                self.logger.debug(f"📥 Response data: {data}")
                    
                if data.get("success"):
                    self.logger.info("✅ Successfully started fishing game")
                    action_token = data.get('actionToken')
                    if action_token:
                        self.logger.info(f"🔑 Action token received: {str(action_token)[:20]}...")
                    else:
                        self.logger.warning("⚠️ No action token in successful response!")
                    return data
                else:
                    self.logger.error(f"❌ Failed to start fishing game: {data.get('message', 'Unknown error')}")
                    return None
            else:
                response_text = response.text if hasattr(response, 'text') else 'No response text'
                self.logger.error(f"❌ HTTP error starting fishing game: {response.status_code}")
                self.logger.error(f"📥 Response text: {response_text}")
                return None
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"❌ Network error starting fishing game: {e}")
            return None
        except Exception as e:
            self.logger.error(f"❌ Unexpected error starting fishing game: {e}")
            return None

    def continue_fishing_game(self, node_id: str = "2", cards: List[int] = None) -> Optional[Dict]:
        """Continue an existing fishing game to get a fresh action token"""
        try:
            if cards is None:
                cards = []
                
            payload = {
                "action": "continue_run",
                "actionToken": "",
                "data": {
                    "cards": cards,
                    "nodeId": node_id
                }
            }
            
            self.logger.info(f"🎣 Continuing fishing game with node {node_id}")
            self.logger.debug(f"📤 Request payload: {payload}")
                
            response = self.session.post(
                self.fishing_action_endpoint,
                json=payload,
                timeout=30
            )
            
            self.logger.info(f"📥 Response status: {response.status_code}")
                
            if response.status_code == 200:
                data = response.json()
                self.logger.debug(f"📥 Response data: {data}")
                    
                if data.get("success"):
                    self.logger.info("✅ Successfully continued fishing game")
                    action_token = data.get('actionToken')
                    if action_token:
                        self.logger.info(f"🔑 Action token received: {str(action_token)[:20]}...")
                    else:
                        self.logger.warning("⚠️ No action token in successful continue response!")
                    return data
                else:
                    self.logger.error(f"❌ Failed to continue fishing game: {data.get('message', 'Unknown error')}")
                    return None
            else:
                response_text = response.text if hasattr(response, 'text') else 'No response text'
                self.logger.error(f"❌ HTTP error continuing fishing game: {response.status_code}")
                self.logger.error(f"📥 Response text: {response_text}")
                return None
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"❌ Network error continuing fishing game: {e}")
            return None
        except Exception as e:
            self.logger.error(f"❌ Unexpected error continuing fishing game: {e}")
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
            
            self.logger.info(f"🎯 Playing fishing cards: {card_indices}")
                
            response = self.session.post(
                self.fishing_action_endpoint,
                json=payload,
                timeout=30
            )
            
            self.logger.info(f"📥 Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.logger.debug(f"📥 Play cards response: {data}")
                if data.get("success"):
                    self.logger.info("✅ Successfully played fishing cards")
                    return data
                else:
                    self.logger.error(f"❌ Failed to play fishing cards: {data.get('message', 'Unknown error')}")
                    return None
            else:
                self.logger.error(f"❌ HTTP error playing fishing cards: {response.status_code}")
                try:
                    error_data = response.json()
                    self.logger.error(f"📥 Error response: {error_data}")
                except:
                    self.logger.error(f"📥 Non-JSON error response: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"❌ Network error playing fishing cards: {e}")
            return None
        except Exception as e:
            self.logger.error(f"❌ Unexpected error playing fishing cards: {e}")
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
            
            self.logger.info(f"🎁 Selecting loot card: {card_id}")
                
            response = self.session.post(
                self.fishing_action_endpoint,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.logger.info("✅ Successfully selected loot card")
                    return data
                else:
                    self.logger.error(f"❌ Failed to select loot card: {data.get('message', 'Unknown error')}")
                    return None
            else:
                self.logger.error(f"❌ HTTP error selecting loot card: {response.status_code}")
                return None
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"❌ Network error selecting loot card: {e}")
            return None
        except Exception as e:
            self.logger.error(f"❌ Unexpected error selecting loot card: {e}")
            return None

    def get_action_token_for_existing_game(self, node_id: str = "2") -> Optional[str]:
        """Try to get an action token for an existing game session"""
        try:
            # This is a workaround - try to get fresh token by making a request
            # that should return the current game state with action token
            payload = {
                "action": "get_state",
                "actionToken": "",
                "data": {
                    "nodeId": node_id
                }
            }
            
            self.logger.info(f"🔄 Attempting to get action token for existing game")
            
            response = self.session.post(
                self.fishing_action_endpoint,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                action_token = data.get('actionToken')
                if action_token:
                    self.logger.info(f"✅ Got action token for existing game: {str(action_token)[:20]}...")
                    return action_token
                else:
                    self.logger.warning("⚠️ No action token in existing game response")
                    return None
            else:
                self.logger.error(f"❌ Failed to get action token for existing game: {response.status_code}")
                return None
                
        except Exception as e:
            self.logger.error(f"❌ Error getting action token for existing game: {e}")
            return None

    def check_fishing_availability(self) -> bool:
        """Check if fishing is available for the current player"""
        try:
            # Make a simple request to check if fishing endpoints are accessible
            response = self.session.get(f"{self.base_url}/fishing/info", timeout=10)
            return response.status_code == 200
        except:
            return True  # Assume available if we can't check

    def get_fishing_session_info(self) -> Dict[str, Any]:
        """Get general fishing session information"""
        try:
            response = self.session.get(f"{self.base_url}/fishing/info", timeout=10)
            if response.status_code == 200:
                return response.json()
            else:
                return {}
        except:
            return {}

    def handle_fishing_events(self, events: List[Dict]) -> Dict[str, Any]:
        """Process and categorize fishing events"""
        processed_events = {
            'fish_caught': [],
            'damage_dealt': [],
            'cards_played': [],
            'loot_received': [],
            'errors': []
        }
        
        for event in events:
            event_type = event.get('type', '')
            if 'fish' in event_type.lower():
                processed_events['fish_caught'].append(event)
            elif 'damage' in event_type.lower():
                processed_events['damage_dealt'].append(event)
            elif 'card' in event_type.lower():
                processed_events['cards_played'].append(event)
            elif 'loot' in event_type.lower():
                processed_events['loot_received'].append(event)
            elif 'error' in event_type.lower():
                processed_events['errors'].append(event)
        
        return processed_events

    def retry_request(self, request_func, max_retries: int = 3, delay: float = 1.0) -> Optional[Dict]:
        """Retry a request function with exponential backoff"""
        for attempt in range(max_retries):
            try:
                result = request_func()
                if result:
                    return result
            except Exception as e:
                self.logger.warning(f"Request attempt {attempt + 1} failed: {e}")
                
            if attempt < max_retries - 1:
                wait_time = delay * (2 ** attempt)
                self.logger.info(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
        
        self.logger.error(f"All {max_retries} attempts failed")
        return None 