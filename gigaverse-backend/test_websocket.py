import asyncio
import websockets
import json
import logging

logging.basicConfig(level=logging.DEBUG)

async def test_websocket():
    try:
        print("🔗 Connecting to WebSocket...")
        async with websockets.connect("ws://localhost:8000/ws") as websocket:
            print("✅ Connected to WebSocket")
            
            # Listen for messages for 10 seconds
            await asyncio.sleep(10)
            
            # Try to receive any messages
            try:
                while True:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    print(f"📨 Received: {message}")
                    
                    # Parse the message
                    data = json.loads(message)
                    if data.get('type') == 'fishing_session' and data.get('category') == 'active_game_found':
                        print("🎮 ACTIVE GAME FOUND EVENT RECEIVED!")
                        print("✅ Continue button should appear!")
                        break
                    elif data.get('type') == 'fishing_session' and data.get('category') == 'no_active_game':
                        print("ℹ️ No active game found")
                        break
                        
            except asyncio.TimeoutError:
                print("⏰ No more messages received")
                
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
