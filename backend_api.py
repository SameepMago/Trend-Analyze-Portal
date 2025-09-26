"""
Backend API for Trend Analysis Portal
Connects the React frontend to the agent backend
"""

import asyncio
import traceback
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os

# Import agent from current directory
try:
    from agent import TrendAgent
    print("✅ Mock Agent loaded successfully")
except ImportError as e:
    print(f"Warning: Could not import TrendAgent: {e}")
    print("Make sure the agent.py file is in the same directory as backend_api.py")
    TrendAgent = None

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

@app.post("/api/analyze-trends", response_model=TrendResponse)
async def analyze_trends(request: TrendRequest):
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
        
        # Run agent analysis
        print(f"Analyzing trends: {request.keywords}")
        selected_program, error_message = await agent.run(request.keywords)
        
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
            
            return TrendResponse(**response_data)
        
        # Handle agent error
        elif error_message:
            print(f"Agent completed with an error: {error_message}")
            return TrendResponse(
                success=False,
                error=error_message,
                message="Agent analysis failed"
            )
        
        # Handle no program found
        else:
            print("No trending program found")
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