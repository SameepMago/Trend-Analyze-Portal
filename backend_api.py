"""
Backend API for Trend Analysis Portal
Connects the React frontend to the agent backend
"""

import asyncio
import traceback
import json
import uuid
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os
from datetime import datetime

# Import agent from current directory
try:
    from agent import TrendAgent
    print("✅ Mock Agent loaded successfully")
except ImportError as e:
    print(f"Warning: Could not import TrendAgent: {e}")
    print("Make sure the agent.py file is in the same directory as backend_api.py")
    TrendAgent = None

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
    
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
    
    async def send_log(self, client_id: str, log_data: dict):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(json.dumps(log_data))
            except:
                self.disconnect(client_id)

manager = ConnectionManager()

app = FastAPI(
    title="Trend Analysis Portal API",
    description="API for analyzing trending entertainment programs",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TrendRequest(BaseModel):
    keywords: List[str]

class TrendResponse(BaseModel):
    success: bool
    program_is_trending: Optional[bool] = None
    program: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    message: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    message: str

class LogEntry(BaseModel):
    timestamp: str
    level: str
    category: str
    message: str
    data: Optional[Dict[str, Any]] = None

@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint for health check"""
    return HealthResponse(
        status="healthy",
        message="Trend Analysis Portal API is running"
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    agent_status = "available" if TrendAgent else "unavailable"
    return HealthResponse(
        status="healthy",
        message=f"API is running. Agent: {agent_status}"
    )

@app.get("/ws/test")
async def websocket_test():
    """Test endpoint to verify WebSocket support"""
    return {"message": "WebSocket endpoint is accessible", "active_connections": len(manager.active_connections)}

@app.websocket("/ws/logs/{client_id}")
async def websocket_logs(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time logs"""
    print(f"WebSocket connection attempt from client: {client_id}")
    try:
        await manager.connect(websocket, client_id)
        print(f"WebSocket connected successfully for client: {client_id}")
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for client: {client_id}")
        manager.disconnect(client_id)
    except Exception as e:
        print(f"WebSocket error for client {client_id}: {e}")
        manager.disconnect(client_id)

@app.post("/api/analyze-trends", response_model=TrendResponse)
async def analyze_trends(request: TrendRequest, client_id: str = Query(None)):
    """
    Analyze trending keywords using the agent
    """
    try:
        # Validate input
        if not request.keywords:
            raise HTTPException(status_code=400, detail="No keywords provided")
        
        # Check if agent is available
        if not TrendAgent:
            raise HTTPException(
                status_code=503, 
                detail="Agent is not available. Please check agent configuration."
            )
        
        # Initialize agent
        agent = TrendAgent()
        
        # Send initial log
        if client_id:
            await manager.send_log(client_id, {
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "category": "ANALYSIS",
                "message": f"Starting trend analysis for: {', '.join(request.keywords)}",
                "data": {"keywords": request.keywords}
            })
        
        # Run agent analysis
        print(f"Analyzing trends: {request.keywords}")
        selected_program, error_message = await agent.run(request.keywords, client_id, manager)
        
        # Handle successful analysis
        if selected_program and not error_message:
            print(f"Agent found program: {selected_program.get('title', 'Unknown')}")
            
            # Format response according to frontend expectations
            response_data = {
                "success": True,
                "program_is_trending": True,  # Agent only returns programs that are trending
                "program": {
                    "title": selected_program.get('title', ''),
                    "program_type": selected_program.get('program_type', 'movie'),
                    "release_year": selected_program.get('release_year'),
                    "description": selected_program.get('descriptions', [''])[0] if selected_program.get('descriptions') else '',
                    "cast": selected_program.get('cast', []),
                    "explanation_of_trend": selected_program.get('explanation_of_trend', ''),
                    "imdb_id": selected_program.get('imdb_id', ''),
                    "poster_path": None  # Will be filled by TMDB API in frontend
                },
                "message": "Successfully identified trending program"
            }
            
            # Send completion log and disconnect WebSocket
            if client_id:
                await manager.send_log(client_id, {
                    "timestamp": datetime.now().isoformat(),
                    "level": "INFO",
                    "category": "RESULT",
                    "message": "Analysis completed successfully",
                    "data": {"result": "trending_program_found"}
                })
                # Disconnect WebSocket after completion
                manager.disconnect(client_id)
            
            return TrendResponse(**response_data)
        
        # Handle agent error
        elif error_message:
            print(f"Agent completed with an error: {error_message}")
            
            # Send error log and disconnect WebSocket
            if client_id:
                await manager.send_log(client_id, {
                    "timestamp": datetime.now().isoformat(),
                    "level": "ERROR",
                    "category": "RESULT",
                    "message": "Analysis completed with error",
                    "data": {"error": error_message}
                })
                # Disconnect WebSocket after completion
                manager.disconnect(client_id)
            
            return TrendResponse(
                success=False,
                error=error_message,
                message="Agent analysis failed"
            )
        
        # Handle no program found
        else:
            print("No trending program found")
            
            # Send no result log and disconnect WebSocket
            if client_id:
                await manager.send_log(client_id, {
                    "timestamp": datetime.now().isoformat(),
                    "level": "INFO",
                    "category": "RESULT",
                    "message": "Analysis completed - no program found",
                    "data": {"result": "no_program_found"}
                })
                # Disconnect WebSocket after completion
                manager.disconnect(client_id)
            
            return TrendResponse(
                success=True,
                program_is_trending=False,
                program=None,
                message="Agent Completed, but no program was identified and no specific error was returned"
            )
    
    except HTTPException:
        raise
    
    except Exception as e:
        print(f"Unexpected error in analyze_trends: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    print("Starting Trend Analysis Portal API...")
    print("Make sure the agent.py file is in the binge-trend-agent directory")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)