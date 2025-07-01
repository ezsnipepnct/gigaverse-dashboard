#!/usr/bin/env python3
"""
Simple test script to debug the backend issues step by step
"""

import sys
import asyncio
import json
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    logger.info("Root endpoint hit")
    return {"message": "Simple test backend is running!"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    logger.info("WebSocket connection attempt")
    await websocket.accept()
    logger.info("WebSocket connection accepted")
    
    try:
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "system",
            "message": "✅ WebSocket connected successfully!",
            "timestamp": "test"
        }))
        
        # Keep connection alive
        while True:
            try:
                data = await websocket.receive_text()
                logger.info(f"Received: {data}")
                
                # Echo back
                await websocket.send_text(json.dumps({
                    "type": "echo",
                    "message": f"Received: {data}",
                    "timestamp": "test"
                }))
                
            except Exception as e:
                logger.error(f"Error in message loop: {e}")
                break
                
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        logger.info("WebSocket connection closed")

if __name__ == "__main__":
    print("🚀 Starting simple test server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug") 