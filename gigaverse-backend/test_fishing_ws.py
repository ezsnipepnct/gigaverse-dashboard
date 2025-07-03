#!/usr/bin/env python3

import asyncio
import websockets
import json
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test configuration
JWT_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhiMGQ5MEQ1MkM3Mzg5ODI0RDRCMjJjMDZiY2RjQ0Q3MzRFMzE2MmI3IiwiaXNzIjoiZ2lnYXZlcnNlIiwiaWF0IjoxNzM1ODc5MzQ4LCJleHAiOjE3MzU5NjU3NDh9.3sGaHPwqA3Bf-ybOzXDBkQ4DbGNv-36oHeMO1Q-nvg0Po5dVwyD_rwvSUnS6y_FR8svjiq6fWs"
WS_URL = "ws://localhost:8000/ws"

class FishingTester:
    def __init__(self):
        self.ws = None
        self.test_events = []
        self.fishing_active = False
        self.session_stats = {}
        
    async def connect(self):
        """Connect to WebSocket"""
        try:
            logger.info("🔗 Connecting to WebSocket...")
            self.ws = await websockets.connect(WS_URL)
            logger.info("✅ Connected to WebSocket")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to connect: {e}")
            return False
    
    async def send_message(self, message):
        """Send a message to the WebSocket"""
        if not self.ws:
            logger.error("❌ Not connected to WebSocket")
            return
        
        try:
            await self.ws.send(json.dumps(message))
            logger.info(f"📤 Sent: {message}")
        except Exception as e:
            logger.error(f"❌ Failed to send message: {e}")
    
    async def receive_messages(self, timeout=30):
        """Receive messages for a specified timeout period"""
        logger.info(f"👂 Listening for messages for {timeout} seconds...")
        
        try:
            start_time = time.time()
            while time.time() - start_time < timeout:
                try:
                    # Set a short timeout for individual receives
                    message = await asyncio.wait_for(self.ws.recv(), timeout=1.0)
                    data = json.loads(message)
                    await self.handle_message(data)
                except asyncio.TimeoutError:
                    continue  # Continue listening
                except Exception as e:
                    logger.error(f"❌ Error receiving message: {e}")
                    break
                    
        except Exception as e:
            logger.error(f"❌ Error in message loop: {e}")
    
    async def handle_message(self, data):
        """Handle received WebSocket messages"""
        msg_type = data.get('type', 'unknown')
        category = data.get('category', 'unknown')
        message = data.get('message', 'no message')
        
        logger.info(f"📥 Received [{msg_type}:{category}]: {message}")
        
        # Store event
        self.test_events.append({
            'type': msg_type,
            'category': category,
            'message': message,
            'timestamp': time.time()
        })
        
        # Handle specific message types
        if msg_type == 'fishing_session':
            if category == 'start':
                self.fishing_active = True
                logger.info("🎣 Fishing session started!")
            elif category in ['end', 'stop']:
                self.fishing_active = False
                logger.info("🛑 Fishing session ended!")
                
        elif msg_type == 'fishing_stats' and category == 'update':
            try:
                stats = json.loads(message)
                self.session_stats = stats
                logger.info("📊 Fishing stats updated:")
                
                # Log key stats with corrected terminology
                if 'player_mana' in stats:
                    logger.info(f"  Player Mana: {stats['player_mana']}/{stats.get('player_max_mana', 'unknown')}")
                elif 'player_hp' in stats:
                    # API might still call it player_hp but it's actually mana
                    logger.info(f"  Player Mana (as HP): {stats['player_hp']}/{stats.get('player_max_hp', 'unknown')}")
                
                if 'fish_hp' in stats:
                    logger.info(f"  Fish HP: {stats['fish_hp']}/{stats.get('fish_max_hp', 'unknown')}")
                    
                if 'fish_position' in stats:
                    logger.info(f"  Fish Position: {stats['fish_position']}")
                    
                if 'hand_size' in stats:
                    logger.info(f"  Hand Size: {stats['hand_size']}")
                    
                if 'mana_remaining' in stats:
                    logger.info(f"  Mana Remaining: {stats['mana_remaining']}")
                    
                if 'is_base_deck' in stats:
                    deck_type = "🎯 Base deck" if stats['is_base_deck'] else "🃏 Expanded deck"
                    logger.info(f"  Deck Type: {deck_type}")
                    
                if 'day' in stats:
                    logger.info(f"  Day: {stats['day']}")
                    
                if 'fish_caught' in stats:
                    logger.info(f"  Fish Caught: {stats['fish_caught']}")
                    
                if 'damage_dealt' in stats:
                    logger.info(f"  Total Damage: {stats['damage_dealt']}")
                    
            except json.JSONDecodeError:
                logger.warning("⚠️ Failed to parse fishing stats")
                
        elif msg_type == 'fishing_turn':
            if category == 'card_selected':
                logger.info(f"🎯 {message}")
            elif category == 'damage':
                logger.info(f"⚔️ {message}")
            elif category == 'heal':
                logger.info(f"❤️ {message}")
            elif category == 'fish_caught':
                logger.info(f"🐟 {message}")
                
        elif msg_type == 'fishing_loot':
            logger.info(f"🎁 Loot event: {message}")
    
    async def test_fishing_flow(self):
        """Test the complete fishing flow"""
        logger.info("🧪 Starting fishing flow test...")
        
        # Connect to WebSocket
        if not await self.connect():
            return False
        
        # Start listening for messages in background
        listen_task = asyncio.create_task(self.receive_messages(60))  # Listen for 60 seconds
        
        # Wait a moment for connection to stabilize
        await asyncio.sleep(1)
        
        # Send fishing start message
        fishing_message = {
            "action": "start_fishing",
            "jwt_token": JWT_TOKEN,
            "continuous": True
        }
        
        await self.send_message(fishing_message)
        logger.info("🎣 Sent fishing start request")
        
        # Wait for messages
        await listen_task
        
        # Analyze results
        logger.info("\n📋 Test Results Summary:")
        logger.info(f"Total events received: {len(self.test_events)}")
        
        # Count event types
        event_counts = {}
        for event in self.test_events:
            event_type = event['type']
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
        
        for event_type, count in event_counts.items():
            logger.info(f"  {event_type}: {count} events")
        
        # Check for key events
        fishing_started = any(e['type'] == 'fishing_session' and e['category'] == 'start' for e in self.test_events)
        card_played = any(e['type'] == 'fishing_turn' and 'card_selected' in e['category'] for e in self.test_events)
        stats_updated = any(e['type'] == 'fishing_stats' for e in self.test_events)
        
        logger.info(f"\n🔍 Key Events Check:")
        logger.info(f"  Fishing session started: {'✅' if fishing_started else '❌'}")
        logger.info(f"  Cards played: {'✅' if card_played else '❌'}")
        logger.info(f"  Stats updated: {'✅' if stats_updated else '❌'}")
        
        # Final stats
        if self.session_stats:
            logger.info(f"\n📊 Final Stats:")
            for key, value in self.session_stats.items():
                if key in ['fish_caught', 'damage_dealt', 'turns_played', 'cards_played']:
                    logger.info(f"  {key}: {value}")
        
        success = fishing_started and (card_played or stats_updated)
        logger.info(f"\n🎯 Overall Test Result: {'✅ SUCCESS' if success else '❌ FAILED'}")
        
        return success
    
    async def cleanup(self):
        """Clean up WebSocket connection"""
        if self.ws:
            await self.ws.close()
            logger.info("🔒 WebSocket connection closed")

async def main():
    """Run the fishing test"""
    tester = FishingTester()
    
    try:
        success = await tester.test_fishing_flow()
        return success
    except Exception as e:
        logger.error(f"❌ Test failed with error: {e}")
        return False
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1) 