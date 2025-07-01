import requests
from termcolor import colored

class ApiManager:
    API_URL = "https://gigaverse.io/api/game/dungeon/action"
    DEFAULT_ACTION_DATA = {"consumables": [], "itemId": 0, "index": 0}
    
    def __init__(self, token):
        self.token = token
        self.headers = {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
            "origin": "https://gigaverse.io",
            "referer": "https://gigaverse.io/play",
            "priority": "u=1, i",
            "sec-ch-ua": '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
        }
    
    def send_action(self, action, action_token, dungeon_id, action_data=None):
        """Sends an action to the game API"""
        payload = {
            "action": action,
            "actionToken": action_token,
            "dungeonId": dungeon_id,
            "data": action_data if action_data is not None else {}
        }
        try:
            response = requests.post(self.API_URL, headers=self.headers, json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(colored(f"Error during API call for action {action}: {e}", 'red'))
            return None