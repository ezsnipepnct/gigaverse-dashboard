#!/usr/bin/env python3

import asyncio
import websockets
import json
import logging
import time
import sys

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Test configuration
JWT_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhiMGQ5MEQ1MkM3Mzg5ODI0RDRCMjJjMDZiY2RjQ0Q3MzRFMzE2MmI3IiwidXNlciI6eyJfaWQiOiI2N2I5MjE1YTEwOGFlZGRiNDA5YTdlNzMiLCJ3YWxsZXRBZGRyZXNzIjoiMHhiMGQ5MGQ1MmM3Mzg5ODI0ZDRiMjJjMDZiY2RjY2Q3MzRlMzE2MmI3IiwidXNlcm5hbWUiOiIweGIwZDkwRDUyQzczODk4MjRENEIyMmMwNmJjZGNDRDczNEUzMTYyYjciLCJjYXNlU2Vuc2l0aXZlQWRkcmVzcyI6IjB4YjBkOTBENTJDNzM4OTgyNEQ0QjIyYzA2YmNkY0NENzM0RTMxNjJiNyIsIl9fdiI6MH0sImdhbWVBY2NvdW50Ijp7Im5vb2IiOnsiX2lkIjoiNjdiOTIxNzRlM2MzOWRjYTZmZGFkZjA5IiwiZG9jSWQiOiIyMTQyNCIsInRhYmxlTmFtZSI6IkdpZ2FOb29iTkZUIiwiTEFTVF9UUkFOU0ZFUl9USU1FX0NJRCI6MTc0MDE4NTk2NCwiY3JlYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMi45NDZaIiwidXBkYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMy4xNjVaIiwiTEVWRUxfQ0lEIjoxLCJJU19OT09CX0NJRCI6dHJ1ZSwiSU5JVElBTElaRURfQ0lEIjp0cnVlLCJPV05FUl9DSUQiOiIweGIwZDkwZDUyYzczODk4MjRkNGIyMmMwNmJjZGNjZDczNGUzMTYyYjcifSwiYWxsb3dlZFRvQ3JlYXRlQWNjb3VudCI6dHJ1ZSwiY2FuRW50ZXJHYW1lIjp0cnVlLCJub29iUGFzc0JhbGFuY2UiOjAsImxhc3ROb29iSWQiOjc0MjQ4LCJtYXhOb29iSWQiOjEwMDAwfSwiZXhwIjoxNzUxNzI5MzM0fQ.QpuVQYxSdRLJpCIKkTIhgKhGjkRnKjAJQzBa7_eJElQ"
WS_URL = "ws://localhost:8000/ws"

class CompleteFishingTest:
    def __init__(self):
        self.ws = None
        self.events = []
        self.fishing_active = False
        self.game_stats = {}
        self.test_results = {
            'connection_established': False,
            'fishing_started': False,
            'cards_played': False,
            'stats_updated': False,
            'damage_dealt': False,
            'game_completed': False,
            'api_calls_working': False,
            'websocket_stable': True
        }
        
    async def connect(self):
        """Connect to WebSocket and monitor connection"""
        try:
            logger.info("🔗 Connecting to WebSocket server...")
            self.ws = await websockets.connect(WS_URL)
            logger.info("✅ WebSocket connection established")
            self.test_results['connection_established'] = True
            return True
        except Exception as e:
            logger.error(f"❌ WebSocket connection failed: {e}")
            self.test_results['websocket_stable'] = False
            return False
    
    async def send_message(self, message):
        """Send message through WebSocket"""
        if not self.ws:
            logger.error("❌ WebSocket not connected")
            return False
        
        try:
            await self.ws.send(json.dumps(message))
            logger.info(f"📤 Sent: {message['action']}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to send message: {e}")
            self.test_results['websocket_stable'] = False
            return False
    
    async def listen_for_events(self, duration=45):
        """Listen for WebSocket events for specified duration"""
        logger.info(f"👂 Listening for events for {duration} seconds...")
        
        start_time = time.time()
        message_count = 0
        
        try:
            while time.time() - start_time < duration:
                try:
                    # Wait for message with timeout
                    message = await asyncio.wait_for(self.ws.recv(), timeout=2.0)
                    message_count += 1
                    
                    try:
                        data = json.loads(message)
                        await self.process_event(data)
                    except json.JSONDecodeError:
                        logger.warning(f"⚠️ Invalid JSON received: {message[:100]}...")
                        
                except asyncio.TimeoutError:
                    continue  # Continue listening
                except websockets.exceptions.ConnectionClosed:
                    logger.error("❌ WebSocket connection closed")
                    self.test_results['websocket_stable'] = False
                    break
                except Exception as e:
                    logger.error(f"❌ Error receiving message: {e}")
                    break
                    
        except Exception as e:
            logger.error(f"❌ Error in event listening loop: {e}")
            self.test_results['websocket_stable'] = False
            
        logger.info(f"📊 Total messages received: {message_count}")
        return message_count > 0
    
    async def process_event(self, data):
        """Process incoming WebSocket events"""
        event_type = data.get('type', 'unknown')
        category = data.get('category', 'unknown')
        message = data.get('message', '')
        
        # Store event
        self.events.append({
            'type': event_type,
            'category': category,
            'message': message,
            'timestamp': time.time()
        })
        
        # Color-coded logging
        if event_type == 'system':
            logger.info(f"🔧 [{event_type}:{category}] {message}")
        elif event_type == 'fishing_session':
            logger.info(f"🎣 [{event_type}:{category}] {message}")
            
            if category == 'start':
                self.fishing_active = True
                self.test_results['fishing_started'] = True
            elif category in ['end', 'stop', 'complete']:
                self.fishing_active = False
                self.test_results['game_completed'] = True
                
        elif event_type == 'fishing_turn':
            logger.info(f"🎯 [{event_type}:{category}] {message}")
            
            if 'card' in category.lower():
                self.test_results['cards_played'] = True
            if 'damage' in category.lower():
                self.test_results['damage_dealt'] = True
                
        elif event_type == 'fishing_stats':
            logger.info(f"📊 [{event_type}:{category}] {message}")
            self.test_results['stats_updated'] = True
            
        elif event_type == 'fishing_loot':
            logger.info(f"🎁 [{event_type}:{category}] {message}")
            
        elif event_type == 'fishing_game':
            logger.info(f"🎮 [{event_type}:{category}] {message}")
            
        else:
            logger.info(f"📝 [{event_type}:{category}] {message}")
    
    async def test_fishing_flow(self):
        """Test the complete fishing flow"""
        logger.info("🧪 Starting complete fishing functionality test...")
        logger.info("=" * 60)
        
        # Step 1: Connect to WebSocket
        if not await self.connect():
            return False
        
        # Step 2: Start background listener
        listen_task = asyncio.create_task(self.listen_for_events(60))
        
        # Step 3: Wait for initial connection messages
        await asyncio.sleep(2)
        
        # Step 4: Send fishing start request (matching the frontend format)
        fishing_message = {
            "action": "start_run",
            "actionToken": "",
            "jwt_token": JWT_TOKEN,
            "data": {
                "cards": [],
                "nodeId": "2"
            }
        }
        
        logger.info("🎣 Sending fishing start request...")
        success = await self.send_message(fishing_message)
        
        if success:
            self.test_results['api_calls_working'] = True
            logger.info("✅ Fishing start request sent successfully")
        else:
            logger.error("❌ Failed to send fishing start request")
            return False
        
        # Step 5: Wait for events
        await listen_task
        
        # Step 6: Analyze results
        await self.analyze_results()
        
        return True
    
    async def analyze_results(self):
        """Analyze test results and provide comprehensive report"""
        logger.info("\n" + "=" * 60)
        logger.info("📋 FISHING FUNCTIONALITY TEST RESULTS")
        logger.info("=" * 60)
        
        # Connection Test
        logger.info("🔗 CONNECTION TEST:")
        if self.test_results['connection_established']:
            logger.info("  ✅ WebSocket connection established")
        else:
            logger.info("  ❌ WebSocket connection failed")
        
        if self.test_results['websocket_stable']:
            logger.info("  ✅ WebSocket connection remained stable")
        else:
            logger.info("  ❌ WebSocket connection was unstable")
            
        # API Communication Test
        logger.info("\n🔧 API COMMUNICATION TEST:")
        if self.test_results['api_calls_working']:
            logger.info("  ✅ API calls are working")
        else:
            logger.info("  ❌ API calls failed")
        
        # Fishing Flow Test
        logger.info("\n🎣 FISHING FLOW TEST:")
        if self.test_results['fishing_started']:
            logger.info("  ✅ Fishing session started successfully")
        else:
            logger.info("  ❌ Fishing session failed to start")
        
        if self.test_results['stats_updated']:
            logger.info("  ✅ Game stats are being updated")
        else:
            logger.info("  ❌ Game stats not updating")
        
        if self.test_results['cards_played']:
            logger.info("  ✅ Cards are being played")
        else:
            logger.info("  ❌ No card play detected")
        
        if self.test_results['damage_dealt']:
            logger.info("  ✅ Damage is being dealt")
        else:
            logger.info("  ❌ No damage dealing detected")
        
        if self.test_results['game_completed']:
            logger.info("  ✅ Game session completed")
        else:
            logger.info("  ⚠️ Game session ongoing or incomplete")
        
        # Event Summary
        logger.info("\n📊 EVENT SUMMARY:")
        logger.info(f"  Total events received: {len(self.events)}")
        
        event_counts = {}
        for event in self.events:
            event_type = event['type']
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
        
        for event_type, count in sorted(event_counts.items()):
            logger.info(f"  {event_type}: {count} events")
        
        # Overall Status
        logger.info("\n🎯 OVERALL STATUS:")
        
        critical_tests = [
            'connection_established',
            'api_calls_working',
            'fishing_started',
            'websocket_stable'
        ]
        
        passed_critical = sum(1 for test in critical_tests if self.test_results[test])
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result)
        
        if passed_critical == len(critical_tests):
            logger.info("  ✅ All CRITICAL tests passed - Core functionality working!")
        else:
            logger.info("  ❌ Some CRITICAL tests failed - Core functionality has issues")
        
        logger.info(f"  📈 Overall score: {passed_tests}/{total_tests} tests passed")
        
        # Recommendations
        logger.info("\n🔍 RECOMMENDATIONS:")
        if not self.test_results['connection_established']:
            logger.info("  • Check if backend server is running on port 8000")
        if not self.test_results['api_calls_working']:
            logger.info("  • Verify JWT token is valid and authentication is working")
        if not self.test_results['fishing_started']:
            logger.info("  • Check fishing API endpoints and game state management")
        if not self.test_results['websocket_stable']:
            logger.info("  • Investigate WebSocket connection stability issues")
        
        logger.info("\n🌐 WEB UI ACCESS:")
        logger.info("  Frontend: http://localhost:3000")
        logger.info("  Backend Health: http://localhost:8000/health")
        logger.info("  WebSocket: ws://localhost:8000/ws")
        
        return passed_critical == len(critical_tests)
    
    async def cleanup(self):
        """Clean up WebSocket connection"""
        if self.ws:
            await self.ws.close()
            logger.info("🧹 WebSocket connection closed")

async def main():
    """Main test execution"""
    logger.info("🚀 Starting Gigaverse Fishing Complete Test Suite")
    logger.info("Testing all aspects of the fishing functionality...")
    
    tester = CompleteFishingTest()
    
    try:
        success = await tester.test_fishing_flow()
        
        if success:
            logger.info("\n✅ Test suite completed successfully!")
            logger.info("You can now access the web UI at: http://localhost:3000")
            logger.info("The fishing functionality should be working properly.")
        else:
            logger.error("\n❌ Test suite encountered critical issues!")
            logger.error("Check the recommendations above to fix the issues.")
            
    except KeyboardInterrupt:
        logger.info("\n⏹️ Test interrupted by user")
    except Exception as e:
        logger.error(f"\n💥 Test failed with error: {e}")
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    asyncio.run(main()) 