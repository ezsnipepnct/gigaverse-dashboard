#!/usr/bin/env python3

import requests
import json
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test configuration
JWT_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhiMGQ5MEQ1MkM3Mzg5ODI0RDRCMjJjMDZiY2RjQ0Q3MzRFMzE2MmI3IiwiaXNzIjoiZ2lnYXZlcnNlIiwiaWF0IjoxNzM1ODc5MzQ4LCJleHAiOjE3MzU5NjU3NDh9.3sGaHPwqA3Bf-ybOzXDBkQ4DbGNv-36oHeMO1Q-nvg0Po5dVwyD_rwvSUnS6y_FR8svjiq6fWs"
BASE_URL = "http://localhost:8000"

def test_fishing_availability():
    """Test if fishing is available"""
    logger.info("🔍 Testing fishing availability...")
    
    headers = {
        'Authorization': f'Bearer {JWT_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(f"{BASE_URL}/api/fishing/availability", headers=headers)
        logger.info(f"Fishing availability response: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ Fishing availability: {json.dumps(data, indent=2)}")
            return data.get('available', False)
        else:
            logger.error(f"❌ Failed to check fishing availability: {response.text}")
            return False
    except Exception as e:
        logger.error(f"❌ Error checking fishing availability: {e}")
        return False

def test_start_fishing():
    """Test starting a fishing game"""
    logger.info("🎣 Testing fishing game start...")
    
    headers = {
        'Authorization': f'Bearer {JWT_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'nodeId': '2'  # Default fishing node
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/fishing/start", headers=headers, json=payload)
        logger.info(f"Start fishing response: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            logger.info("✅ Fishing game started successfully!")
            logger.info(f"Response preview: {json.dumps({k: v for k, v in data.items() if k != 'data'}, indent=2)}")
            
            # Check for key components
            if 'actionToken' in data:
                logger.info(f"🔑 Action token received: {data['actionToken'][:20]}...")
            
            if 'data' in data and 'gameState' in data['data']:
                game_state = data['data']['gameState']['data']
                logger.info("🎮 Game state components:")
                
                # Check player mana (was player HP)
                if 'playerHp' in game_state:
                    logger.info(f"  Player Mana: {game_state['playerHp']}/{game_state.get('playerMaxHp', 'unknown')}")
                
                # Check fish HP
                if 'fishHp' in game_state:
                    logger.info(f"  Fish HP: {game_state['fishHp']}/{game_state.get('fishMaxHp', 'unknown')}")
                
                # Check fish position
                if 'fishPosition' in game_state:
                    logger.info(f"  Fish Position: {game_state['fishPosition']}")
                
                # Check deck composition
                if 'hand' in game_state:
                    hand_cards = game_state['hand']
                    logger.info(f"  Hand: {hand_cards}")
                    
                    # Check if it's a base deck (cards 1-10)
                    all_cards = set(hand_cards + game_state.get('discard', []))
                    is_base_deck = all_cards.issubset(set(range(1, 11))) and len(all_cards) <= 10
                    logger.info(f"  {'🎯 Base deck detected' if is_base_deck else '🃏 Expanded deck'}")
                
                # Check day
                if 'day' in game_state:
                    logger.info(f"  Day: {game_state['day']}")
                
                # Check card data
                if 'deckCardData' in game_state:
                    cards = game_state['deckCardData']
                    logger.info(f"  Card data loaded: {len(cards)} cards")
                    
                    # Sample a card to check for miss zones
                    if cards:
                        sample_card = cards[0]
                        logger.info(f"  Sample card {sample_card['id']}:")
                        logger.info(f"    Mana cost: {sample_card.get('manaCost', 'unknown')}")
                        logger.info(f"    Hit zones: {sample_card.get('hitZones', [])}")
                        logger.info(f"    Crit zones: {sample_card.get('critZones', [])}")
                        logger.info(f"    Miss zones: {sample_card.get('missZones', 'N/A')}")
            
            return data
        else:
            logger.error(f"❌ Failed to start fishing: {response.text}")
            return None
    except Exception as e:
        logger.error(f"❌ Error starting fishing: {e}")
        return None

def test_play_card(action_token, card_id):
    """Test playing a card"""
    logger.info(f"🎯 Testing card play: card {card_id}...")
    
    headers = {
        'Authorization': f'Bearer {JWT_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'actionToken': action_token,
        'cardIndices': [card_id],
        'nodeId': '2'
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/fishing/play", headers=headers, json=payload)
        logger.info(f"Play card response: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ Card {card_id} played successfully!")
            
            # Check game state changes
            if 'data' in data and 'gameState' in data['data']:
                game_state = data['data']['gameState']['data']
                
                # Check HP changes
                fish_hp = game_state.get('fishHp', 'unknown')
                player_mana = game_state.get('playerHp', 'unknown')  # API still calls it playerHp
                
                logger.info(f"  After card play:")
                logger.info(f"    Fish HP: {fish_hp}")
                logger.info(f"    Player Mana: {player_mana}")
                logger.info(f"    Fish Position: {game_state.get('fishPosition', 'unknown')}")
                
                # Check for loot phase
                if 'lootOptions' in data['data']:
                    loot_options = data['data']['lootOptions']
                    if loot_options:
                        logger.info(f"🎁 Loot phase triggered! Options: {[opt['id'] for opt in loot_options]}")
                
            return data
        else:
            logger.error(f"❌ Failed to play card: {response.text}")
            return None
    except Exception as e:
        logger.error(f"❌ Error playing card: {e}")
        return None

def main():
    """Run fishing tests"""
    logger.info("🧪 Starting fishing API tests...")
    
    # Test 1: Check availability
    if not test_fishing_availability():
        logger.error("❌ Fishing not available, stopping tests")
        return
    
    # Test 2: Start fishing game
    start_data = test_start_fishing()
    if not start_data:
        logger.error("❌ Failed to start fishing, stopping tests")
        return
    
    action_token = start_data.get('actionToken')
    if not action_token:
        logger.error("❌ No action token received, stopping tests")
        return
    
    # Test 3: Try to play a card
    if 'data' in start_data and 'gameState' in start_data['data']:
        game_state = start_data['data']['gameState']['data']
        hand = game_state.get('hand', [])
        
        if hand:
            card_to_play = hand[0]  # Play first card in hand
            play_data = test_play_card(action_token, card_to_play)
            
            if play_data:
                logger.info("✅ All tests completed successfully!")
            else:
                logger.error("❌ Card play test failed")
        else:
            logger.warning("⚠️ No cards in hand to test")
    else:
        logger.error("❌ No game state received")

if __name__ == "__main__":
    main() 