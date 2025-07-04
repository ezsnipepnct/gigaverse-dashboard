#!/usr/bin/env python3
import asyncio
import websockets
import json
import time

async def test_fishing():
    uri = "ws://localhost:8000/ws"
    
    try:
        print("🔌 Connecting to WebSocket...")
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket!")
            
            # Wait for initial connection message
            initial_message = await websocket.recv()
            print(f"📩 Received: {initial_message}")
            
            # Test fishing start message
            fishing_message = {
                "action": "start_run",
                "actionToken": "",
                "jwt_token": "test_token_123",  # Use a test token
                "data": {
                    "cards": [],
                    "nodeId": "2"
                }
            }
            
            print(f"📤 Sending fishing start message: {fishing_message}")
            await websocket.send(json.dumps(fishing_message))
            
            # Wait for multiple responses (the backend might send several messages)
            print("⏳ Waiting for responses...")
            for i in range(5):  # Wait for up to 5 messages
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                    print(f"📩 Response {i+1}: {response}")
                except asyncio.TimeoutError:
                    print(f"⏰ No more messages after {i} responses")
                    break
            
    except websockets.exceptions.ConnectionClosed:
        print("❌ WebSocket connection closed")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🎣 Testing Fishing WebSocket Functionality")
    print("==========================================")
    asyncio.run(test_fishing()) 