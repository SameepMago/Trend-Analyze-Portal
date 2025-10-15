"""
Backend API for Trend Analysis Portal
Connects the React frontend to the agent backend
"""

import asyncio
import traceback
import json
import uuid
import time
import pandas as pd
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import psycopg2
from psycopg2.extras import RealDictCursor
import requests

# Database configuration
DB_CONFIG = {
    "host": "localhost",
    "database": "postgres",
    "user": "postgres",
    "password": "Sameep123@",
    "port": 5432,
    "schema": "bingeplus_internal"
}

def get_db_connection():
    """Get PostgreSQL database connection"""
    try:
        # Create connection config without schema (schema is not a connection parameter)
        conn_config = {k: v for k, v in DB_CONFIG.items() if k != 'schema'}
        conn = psycopg2.connect(**conn_config)
        return conn
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return None

def insert_trend_data(conn, cursor, trend_name, category, search_volume, started, ended, trends_breakdown, explore_links):
    """Insert or update trend data in the database"""
    query = f"""
    INSERT INTO {DB_CONFIG['schema']}.google_trends 
    (trends, category, search_volume, trend_started, trend_ended, trend_breakdown, explore_link)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (trends, category) DO UPDATE SET
        trend_ended = EXCLUDED.trend_ended,
        search_volume = EXCLUDED.search_volume,
        trend_started = EXCLUDED.trend_started,
        trend_breakdown = EXCLUDED.trend_breakdown,
        explore_link = EXCLUDED.explore_link
    """
    cursor.execute(query, (trend_name, category, search_volume, started, ended, trends_breakdown, explore_links))
    conn.commit()


def categories_clause(trend_categories):
    """Format categories for SQL IN clause"""
    return ",".join([f"'{cat}'" for cat in trend_categories])

def get_new_trends(trend_categories, count):
    """Get new trends from database that haven't been processed yet"""
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        categories = categories_clause(trend_categories)
        query = f"""
        select gt.* from {DB_CONFIG['schema']}.google_trends gt
        left join {DB_CONFIG['schema']}.trends_to_topics tt on gt.id = tt.google_trend_id
        where tt.id is null and gt.category in ({categories})
        ORDER by trend_ended desc,gt.trend_started desc limit {count}
        """
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query)
            return cur.fetchall()
    
    except Exception as e:
        print(f"❌ Error getting new trends: {e}")
        return []
    finally:
        conn.close()

# API functions for ingest and upsert
def call_ingest_topic_api(name, topic_type, source_id, source_name, source_id_type, **kwargs):
    """Call the ingest topic API endpoint"""
    
    # API endpoint URL - adjust this to match your actual API endpoint
    api_url = "http://localhost:8000/merger/ingest_topic"  # Update this URL as needed
    
    payload = {
        "name": name,
        "topic_type": topic_type,
        "source_id": source_id,
        "source_name": source_name,
        "source_id_type": source_id_type
    }
    
    # Add optional fields if provided
    if 'umd_program_id' in kwargs:
        payload['umd_program_id'] = kwargs['umd_program_id']
    if 'description' in kwargs:
        payload['description'] = kwargs['description']
    if 'date' in kwargs:
        payload['date'] = kwargs['date']
    
    try:
        response = requests.post(api_url, json=payload)
        if response.status_code == 200:
            result = response.json()
            return result.get('topic_id')
        else:
            print(f"❌ Ingest topic API error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error calling ingest topic API: {e}")
        return None

def call_upsert_trend_api(topic_id, source, trend_info, source_detail=None):
    """Call the upsert trend API endpoint"""
    
    # API endpoint URL - adjust this to match your actual API endpoint
    api_url = "http://localhost:8000/merger/upsert_trend"  # Update this URL as needed
    
    payload = {
        "topic_id": topic_id,
        "source": source,
        "trend_info": trend_info
    }
    
    if source_detail:
        payload['source_detail'] = source_detail
    
    try:
        response = requests.post(api_url, json=payload)
        if response.status_code == 200:
            result = response.json()
            return result.get('success', False)
        else:
            print(f"❌ Upsert trend API error: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error calling upsert trend API: {e}")
        return False

def insert_trend_to_topic(trend_id, topic, topic_category, llm_output, date):
    """Insert trend to topic in database"""
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        insert_query = f"""
        INSERT INTO {DB_CONFIG['schema']}.trends_to_topics 
        (google_trend_id, topic, topic_category, llm_output,date)
        VALUES (%s, %s, %s, %s, %s);
        """
        
        with conn.cursor() as cur:
            cur.execute(insert_query, (trend_id, topic, topic_category, llm_output, date))
            conn.commit()
            return True
    
    except Exception as e:
        print(f"❌ Error inserting trend to topic: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def save_csv_to_database(csv_path: str) -> bool:
    """Save CSV data to PostgreSQL database"""
    try:
        print(f"📊 Loading CSV data from: {csv_path}")
        df = pd.read_csv(csv_path)
        print(f"📊 CSV columns: {df.columns.tolist()}")
        print(f"📊 Total rows: {len(df)}")
        
        conn = get_db_connection()
        if not conn:
            print("❌ Failed to connect to database")
            return False
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Insert new data with individual transaction handling
        inserted_count = 0
        import re
        
        for index, row in df.iterrows():
            try:
                # Map CSV columns to database schema
                trends = str(row.get('Trends', '')).strip()
                
                # Parse search volume - extract only the number part, ignore everything after
                search_volume_raw = str(row.get('Search volume', '0')).strip()
                search_volume = 0
                if search_volume_raw and search_volume_raw != 'nan':
                    try:
                        # Extract only the numeric part from the beginning
                        match = re.match(r'^(\d+)', search_volume_raw)
                        if match:
                            search_volume = int(match.group(1))
                        else:
                            search_volume = 0
                    except:
                        search_volume = 0
                
                trend_started = pd.to_datetime(row.get('Started'), errors='coerce')
                trend_ended = pd.to_datetime(row.get('Ended'), errors='coerce') if pd.notna(row.get('Ended')) else None
                trend_breakdown = str(row.get('Trend breakdown', '')).strip()
                explore_link = str(row.get('Explore link', '')).strip()
                
                # Skip rows with missing required data
                if not trends or pd.isna(trend_started):
                    print(f"⚠️ Skipping row {index}: missing required data")
                    continue
                
                # Convert trend_breakdown to array (comma-separated values)
                trend_breakdown_array = []
                if trend_breakdown and trend_breakdown != 'nan':
                    trend_breakdown_array = [item.strip() for item in trend_breakdown.split(',') if item.strip()]
                
                # Insert using the new function
                insert_trend_data(conn, cursor, trends, 'Entertainment', search_volume, trend_started, trend_ended, trend_breakdown_array, explore_link if explore_link != 'nan' else None)
                inserted_count += 1
                
            except Exception as e:
                print(f"❌ Error inserting row {index}: {e}")
                # Rollback the failed transaction
                conn.rollback()
                continue
        
        print(f"✅ Successfully inserted {inserted_count} records into database")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Database save error: {e}")
        traceback.print_exc()
        if conn:
            conn.rollback()
            conn.close()
        return False

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

# Google Trends Helper Functions
def get_downloads_dir() -> str:
    """Return the user's Downloads directory in a cross-platform way."""
    home = os.path.expanduser("~")
    downloads = os.path.join(home, "Downloads")
    # Fallback to home if Downloads doesn't exist for some reason
    return downloads if os.path.isdir(downloads) else home


def download_google_trends_csv() -> Optional[str]:
    """Open Google Trends, click Export → Download CSV, and save to Downloads.

    Returns the absolute path of the downloaded CSV if found, otherwise None.
    """
    print("🔧 Preparing Chrome for Google Trends CSV download…")

    # Configure Chrome to download into the user's Downloads folder
    downloads_dir = get_downloads_dir()
    print(f"📁 Download directory: {downloads_dir}")

    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--remote-debugging-port=9222")

    prefs = {
        "download.default_directory": downloads_dir,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "safebrowsing.enabled": True,
    }
    chrome_options.add_experimental_option("prefs", prefs)

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    try:
        print("🌐 Navigating to Google Trends…")
        driver.get("https://trends.google.com/trending?geo=US")

        WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        time.sleep(5)  # extra time for dynamic content

        print(f"🔍 Page: {driver.title}")

        # Try to find Export button
        export_button = None
        export_selectors = [
            "button:contains('Export')",
            "button[aria-label*='Export']",
            "button[title*='Export']",
            "[role='button']:contains('Export')",
            "button[data-testid*='export']",
            "button[aria-label*='ios_share']",
            "[aria-label*='Export']",
            ".export-button",
            "[class*='export']",
        ]

        for selector in export_selectors:
            try:
                export_button = WebDriverWait(driver, 3).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                )
                print(f"✅ Export button via selector: {selector}")
                break
            except Exception:
                continue

        if not export_button:
            print("🔎 Scanning buttons for 'Export' text…")
            for button in driver.find_elements(By.TAG_NAME, "button"):
                try:
                    text = (button.text or "").lower()
                    aria = (button.get_attribute("aria-label") or "").lower()
                    title = (button.get_attribute("title") or "").lower()
                    if "export" in text or "export" in aria or "export" in title:
                        export_button = button
                        print("✅ Export button found by text")
                        break
                except Exception:
                    continue

        if not export_button:
            print("❌ Could not find Export button")
            return None

        try:
            export_button.click()
        except Exception:
            driver.execute_script("arguments[0].click();", export_button)
            print("ℹ️ Used JS click for Export")

        time.sleep(3)  # wait for dropdown to show

        # Find Download CSV
        csv_button = None
        csv_selectors = [
            "a:contains('Download CSV')",
            "button:contains('Download CSV')",
            "a[aria-label*='Download CSV']",
            "button[aria-label*='Download CSV']",
            "a[title*='Download CSV']",
            "button[title*='Download CSV']",
            "[role='menuitem']:contains('Download CSV')",
            "[role='menuitem'][aria-label*='Download CSV']",
            "[role='menuitem'][aria-label*='CSV']",
            "a[aria-label*='csv']",
            "button[aria-label*='csv']",
            ".menu-item:contains('Download CSV')",
            ".dropdown-item:contains('Download CSV')",
        ]

        for selector in csv_selectors:
            try:
                csv_button = WebDriverWait(driver, 3).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                )
                print(f"✅ 'Download CSV' via selector: {selector}")
                break
            except Exception:
                continue

        if not csv_button:
            print("🔎 Scanning dropdown elements for 'Download CSV'…")
            dropdown_elements = driver.find_elements(
                By.CSS_SELECTOR, "[role='menuitem'], .menu-item, .dropdown-item, a, button"
            )
            for element in dropdown_elements:
                try:
                    text = (element.text or "").lower()
                    aria = (element.get_attribute("aria-label") or "").lower()
                    title = (element.get_attribute("title") or "").lower()
                    if "download csv" in text or "download csv" in aria or "download csv" in title:
                        csv_button = element
                        print("✅ 'Download CSV' found by text")
                        break
                except Exception:
                    continue

        if not csv_button:
            print("❌ Could not find 'Download CSV' option")
            return None

        try:
            csv_button.click()
        except Exception:
            driver.execute_script("arguments[0].click();", csv_button)
            print("ℹ️ Used JS click for 'Download CSV'")

        # Wait for download to complete
        time.sleep(8)

        # Find newest CSV in Downloads
        csv_files = [
            f for f in os.listdir(downloads_dir)
            if f.lower().endswith(".csv")
        ]
        if not csv_files:
            print("❌ No CSV file detected in Downloads")
            return None

        csv_files.sort(
            key=lambda x: os.path.getmtime(os.path.join(downloads_dir, x)),
            reverse=True,
        )
        csv_path = os.path.join(downloads_dir, csv_files[0])
        print(f"✅ CSV downloaded: {csv_path}")
        return csv_path

    finally:
        driver.quit()

def parse_google_trends_from_db(top_n: int = 10) -> List[dict]:
    """Parse Google Trends from database and return full trend data."""
    try:
        # Define trend categories to look for
        trend_categories = ['Entertainment']
        
        print(f"Fetching top {top_n} trends from database...")
        print(f"Looking for categories: {trend_categories}")
        
        # Get new trends from database
        trend_results = get_new_trends(trend_categories, top_n)
        
        if not trend_results:
            print("No new trends found in database")
            return []
        
        print(f"Found {len(trend_results)} trends from database")
        
        # Return full trend data instead of just trend breakdown
        return trend_results[:top_n]
    except Exception as e:
        print(f"❌ Error parsing trends from database: {e}")
        traceback.print_exc()
        return []

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
    trend_data: Optional[List[Dict[str, Any]]] = None

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

class GoogleTrendsRequest(BaseModel):
    top_n: int = 10

class GoogleTrendsResponse(BaseModel):
    success: bool
    trends: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None

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

@app.post("/api/fetch-google-trends", response_model=GoogleTrendsResponse)
async def fetch_google_trends(request: GoogleTrendsRequest):
    """
    Fetch latest Google Trends and return top N trending keywords
    """
    try:
        print(f"📊 Fetching top {request.top_n} Google Trends...")
        
        # Download CSV from Google Trends
        csv_path = await asyncio.to_thread(download_google_trends_csv)
        
        if not csv_path:
            raise HTTPException(
                status_code=500,
                detail="Failed to download Google Trends CSV"
            )
        
        # Save CSV data to database BEFORE parsing
        print("💾 Saving CSV data to database...")
        db_save_success = await asyncio.to_thread(save_csv_to_database, csv_path)
        
        if not db_save_success:
            print("⚠️ Warning: Failed to save data to database, but continuing with parsing")
        
        # Parse trends from database and get full trend data
        trends = parse_google_trends_from_db(request.top_n)
        
        if not trends:
            raise HTTPException(
                status_code=500,
                detail="Failed to parse trends from database"
            )
        
        print(f"✅ Successfully fetched {len(trends)} trends from database")
        
        return GoogleTrendsResponse(
            success=True,
            trends=trends
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        print(f"❌ Error fetching Google Trends: {e}")
        traceback.print_exc()
        return GoogleTrendsResponse(
            success=False,
            error=str(e)
        )

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
        selected_program, error_message, successfully_completed = await agent.run(request.keywords, client_id, manager)
        
        # Handle the 3 cases: program found, agent error, or no program found
        if selected_program and successfully_completed:
            print(f"Agent found program: {selected_program.get('title', 'Unknown')}")
            
            # Store topic_id for response
            topic_id = None
            
            # Call ingest topic API when agent is successful
            if selected_program and request.trend_data:
                for trend in request.trend_data:
                    try:
                        # Prepare ingest topic API call
                        topic_id = call_ingest_topic_api(
                            name=selected_program.get('title', ''),
                            topic_type=selected_program.get('program_type', 'movie'),
                            source_id=trend.get('id', ''),
                            source_name=f"{DB_CONFIG['schema']}.google_trends",
                            source_id_type='id',
                            description=selected_program.get('descriptions', [''])[0] if selected_program.get('descriptions') else '',
                            date=trend.get('trend_started')
                        )
                        
                        if topic_id:
                            # Call upsert trend API after successful ingest
                            trend_info = {
                                'search_volume': trend.get('search_volume', 0),
                                'trend_breakdown': trend.get('trend_breakdown', []),
                                'trend_started': trend.get('trend_started'),
                                'trend_ended': trend.get('trend_ended')
                            }
                            
                            upsert_success = call_upsert_trend_api(
                                topic_id=topic_id,
                                source='google',
                                trend_info=trend_info,
                                source_detail=trend.get('explore_link')
                            )
                            
                            if upsert_success:
                                print(f"✅ Successfully upserted trend for topic {topic_id}")
                            else:
                                print(f"⚠️ Failed to upsert trend for topic {topic_id}")
                        else:
                            print(f"⚠️ Failed to ingest topic for trend {trend.get('id', 'unknown')}")
                            
                    except Exception as e:
                        print(f"❌ Error in API calls for trend {trend.get('id', 'unknown')}: {e}")
            
            # Format response according to frontend expectations
            # When program is returned, it's always trending (agent only returns trending programs)
            response_data = {
                "success": True,
                "program_is_trending": True,  # Always true when program is returned
                "program": {
                    "title": selected_program.get('title', ''),
                    "program_type": selected_program.get('program_type', 'movie'),
                    "release_year": selected_program.get('release_year'),
                    "description": selected_program.get('descriptions', [''])[0] if selected_program.get('descriptions') else '',
                    "cast": selected_program.get('cast', []),
                    "explanation_of_trend": selected_program.get('explanation_of_trend', ''),
                    "imdb_id": selected_program.get('imdb_id', ''),
                    "topic_id": topic_id,  # Include topic_id in response
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
        
        # Handle agent error (only when not successfully completed)
        elif not successfully_completed:
            print(f"Agent failed with error: {error_message}")
            
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
        
        # Handle no program found but agent completed successfully
        else:
            print("Agent completed successfully but no program found")
            if error_message:
                print(f"Agent info: {error_message}")
            
            # Send no result log and disconnect WebSocket
            if client_id:
                await manager.send_log(client_id, {
                    "timestamp": datetime.now().isoformat(),
                    "level": "INFO",
                    "category": "RESULT",
                    "message": "Analysis completed - no program found",
                    "data": {"result": "no_program_found", "info": error_message}
                })
                # Disconnect WebSocket after completion
                manager.disconnect(client_id)
            
            return TrendResponse(
                success=True,
                program_is_trending=False,
                program=None,
                message=error_message or "Agent completed successfully but no program was identified"
            )
        
        # Insert trend to topic regardless of agent success/failure
        if request.trend_data:
            for trend in request.trend_data:
                try:
                    # Determine topic and category based on agent result
                    if selected_program and successfully_completed:
                        topic = selected_program.get('title', '')
                        topic_category = selected_program.get('program_type', 'movie')
                        llm_output = selected_program.get('explanation_of_trend', '')
                    else:
                        # Fallback when agent fails or no program found
                        topic = ', '.join(request.keywords[:3])  # Use first 3 keywords
                        topic_category = 'unknown'
                        llm_output = error_message or 'No program identified'
                    
                    # Insert trend to topic
                    insert_success = insert_trend_to_topic(
                        trend_id=trend.get('id', ''),
                        topic=topic,
                        topic_category=topic_category,
                        llm_output=llm_output,
                        date=trend.get('trend_started')
                    )
                    
                    if insert_success:
                        print(f"✅ Successfully inserted trend {trend.get('id', 'unknown')} to topic")
                    else:
                        print(f"⚠️ Failed to insert trend {trend.get('id', 'unknown')} to topic")
                        
                except Exception as e:
                    print(f"❌ Error inserting trend to topic for trend {trend.get('id', 'unknown')}: {e}")
    
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