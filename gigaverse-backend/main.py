import os
import sys
import asyncio
import json
import threading
import time
import logging
from datetime import datetime
from asyncio import Queue
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from giga_cli_bot.api_manager import ApiManager
from giga_cli_bot.state_manager import StateManager
from giga_cli_bot.loot_manager import LootManager
from giga_cli_bot.ui_manager import UiManager
from web_game_manager import WebGameManager
from sync_event_emitter import SyncEventEmitter
from fishing_api import FishingApiManager
from web_fishing_manager import WebFishingManager

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StartGameRequest(BaseModel):
    jwt: str
    mode: str

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": "Gigaverse Backend API"}

@app.get("/health")
async def health_check():
    logger.info("Health check endpoint accessed")
    return {"status": "healthy", "message": "Backend is running"}

class WebSocketManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.is_polling = False
    
    async def connect(self, websocket: WebSocket):
        try:
            await websocket.accept()
            self.active_connections.append(websocket)
            logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
            return True
        except Exception as e:
            logger.error(f"Failed to accept WebSocket connection: {e}")
            return False
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected. Remaining connections: {len(self.active_connections)}")
    
    async def send_to_all(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Failed to send message to connection: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for conn in disconnected:
            self.disconnect(conn)
    
    async def start_polling(self):
        if self.is_polling:
            return
        
        self.is_polling = True
        logger.info("Started event polling")
        
        while self.is_polling and self.active_connections:
            try:
                events = event_emitter.get_events()
                if events:
                    logger.debug(f"Broadcasting {len(events)} events")
                    for event in events:
                        await self.send_to_all(json.dumps(event))
                await asyncio.sleep(0.1)  # 100ms polling
            except Exception as e:
                logger.error(f"Error in polling loop: {e}")
                await asyncio.sleep(1)
        
        self.is_polling = False
        logger.info("Stopped event polling")

# Initialize the event emitter
event_emitter = SyncEventEmitter()

manager = WebSocketManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    logger.info("New WebSocket connection attempt")
    
    connected = await manager.connect(websocket)
    if not connected:
        logger.error("Failed to establish WebSocket connection")
        return
    
    try:
        # Start polling task
        polling_task = asyncio.create_task(manager.start_polling())
        
        # Send initial connection confirmation
        await websocket.send_text(json.dumps({
            "type": "system",
            "category": "connection",
            "message": "Connected to Gigaverse Backend",
            "timestamp": time.time()
        }))
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                logger.info(f"Received WebSocket message: {data}")
                
                message = json.loads(data)
                
                if message.get("action") == "start_game":
                    jwt_token = message.get("jwt_token")
                    game_mode = message.get("game_mode", "normal")
                    
                    logger.info(f"Starting game with mode: {game_mode}")
                    
                    # Send game start confirmation
                    await websocket.send_text(json.dumps({
                        "type": "game_flow",
                        "category": "start",
                        "message": f"🎮 Starting {game_mode.title()} mode game...",
                        "timestamp": time.time()
                    }))
                    
                    # Start game in separate thread
                    def run_game():
                        try:
                            logger.info("Initializing game components")
                            api_manager = ApiManager(jwt_token)
                            state_manager = StateManager()
                            loot_manager = LootManager()
                            ui_manager = UiManager()
                            
                            logger.info("Creating web game manager")
                            game_manager = WebGameManager(api_manager, state_manager, loot_manager, ui_manager, event_emitter)
                            
                            logger.info("Starting game execution")
                            game_manager.play_game(game_mode)
                            logger.info("Game execution completed")
                        except Exception as e:
                            logger.error(f"Game execution error: {e}")
                            event_emitter.emit("system", "error", f"❌ Game error: {str(e)}")
                    
                    game_thread = threading.Thread(target=run_game, daemon=True)
                    game_thread.start()
                    logger.info("Game thread started")
                
                elif message.get("action") == "start_run":
                    # Handle fishing start request
                    jwt_token = message.get("jwt_token")
                    
                    logger.info("Starting fishing run")
                    
                    # Send fishing start confirmation
                    await websocket.send_text(json.dumps({
                        "type": "fishing_session",
                        "category": "start",
                        "message": "🎣 Starting fishing run...",
                        "timestamp": time.time()
                    }))
                    
                    # Start fishing session in separate thread
                    def run_fishing():
                        try:
                            logger.info("Initializing fishing session with correct API")
                            
                            # Use the CORRECT FishingApiManager instead of dungeon ApiManager
                            fishing_api = FishingApiManager(token=jwt_token, logger=logger)
                            
                            # Use the CORRECT fishing API method with correct action "start_run"
                            fishing_response = fishing_api.start_fishing_game(node_id="2")
                            
                            if fishing_response and fishing_response.get('success'):
                                event_emitter.emit("fishing_session", "start", "✅ Fishing session started successfully!")
                                logger.info("Fishing session started successfully")
                                logger.info(f"Action token: {fishing_response.get('actionToken')}")
                                
                                # Initialize web fishing manager for continuous play
                                web_fishing_manager = WebFishingManager(jwt_token, event_emitter, logger)
                                web_fishing_manager.start_fishing_session(run_continuously=True)
                            else:
                                error_msg = fishing_response.get('message', 'Unknown error') if fishing_response else 'No response from fishing API'
                                event_emitter.emit("fishing_session", "error", f"❌ Failed to start fishing: {error_msg}")
                                logger.error(f"Failed to start fishing: {error_msg}")
                                
                        except Exception as e:
                            logger.error(f"Fishing start error: {e}")
                            event_emitter.emit("fishing_session", "error", f"❌ Fishing error: {str(e)}")
                    
                    fishing_thread = threading.Thread(target=run_fishing, daemon=True)
                    fishing_thread.start()
                    logger.info("Fishing thread started")
                
                elif message.get("action") == "continue_run":
                    # Handle fishing continue request
                    jwt_token = message.get("jwt_token")
                    
                    logger.info("Continuing fishing run")
                    
                    # Send fishing continue confirmation
                    await websocket.send_text(json.dumps({
                        "type": "fishing_session",
                        "category": "continue",
                        "message": "🎮 Continuing existing fishing game...",
                        "timestamp": time.time()
                    }))
                    
                    # Continue monitoring existing fishing session
                    def continue_fishing():
                        try:
                            logger.info("Continuing existing fishing session with correct API")
                            
                            # Use the CORRECT FishingApiManager to continue existing game
                            fishing_api = FishingApiManager(token=jwt_token, logger=logger)
                            
                            # Try to continue the existing fishing game
                            continue_response = fishing_api.continue_fishing_game(node_id="2")
                            
                            if continue_response and continue_response.get('success'):
                                event_emitter.emit("fishing_session", "continue", "✅ Continued existing fishing game!")
                                logger.info("Successfully continued existing fishing game")
                                
                                # Initialize web fishing manager to handle the existing game
                                web_fishing_manager = WebFishingManager(jwt_token, event_emitter, logger)
                                web_fishing_manager.start_fishing_session(run_continuously=True)
                            else:
                                error_msg = continue_response.get('message', 'Unknown error') if continue_response else 'No response from fishing API'
                                event_emitter.emit("fishing_session", "error", f"❌ Failed to continue fishing: {error_msg}")
                                logger.error(f"Failed to continue fishing: {error_msg}")
                            
                        except Exception as e:
                            logger.error(f"Fishing continue error: {e}")
                            event_emitter.emit("fishing_session", "error", f"❌ Fishing continue error: {str(e)}")
                    
                    continue_thread = threading.Thread(target=continue_fishing, daemon=True)
                    continue_thread.start()
                    logger.info("Fishing continue thread started")
                
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected by client")
                break
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON received: {e}")
                await websocket.send_text(json.dumps({
                    "type": "system",
                    "category": "error",
                    "message": "Invalid message format",
                    "timestamp": time.time()
                }))
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                break
                
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        manager.disconnect(websocket)
        manager.is_polling = False

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Gigaverse Backend Server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
