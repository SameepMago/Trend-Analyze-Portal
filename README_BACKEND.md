# Trend Analysis Portal - Backend API

This backend API connects the React frontend to the agent for analyzing trending entertainment programs.

## 🚀 Quick Start

### 1. Install Backend Dependencies

```bash
pip install -r backend_requirements.txt
```

### 2. Set Up Agent Directory

Make sure your agent code is in the `binge-trend-agent/` directory:

```
binge_trend_code/
├── binge-trend-agent/
│   └── agent.py          # Your agent code
├── backend_api.py        # This API
├── backend_requirements.txt
└── start_backend.py      # Startup script
```

### 3. Start the Backend Server

```bash
python start_backend.py
```

The server will start at `http://localhost:8000`

## 📡 API Endpoints

### Health Check
- **GET** `/health` - Check if API and agent are running

### Trend Analysis
- **POST** `/api/analyze-trends` - Analyze multiple trending keywords
- **POST** `/api/analyze-single-trend` - Analyze a single trend (for testing)

### API Documentation
- **GET** `/docs` - Interactive API documentation (Swagger UI)

## 🔧 API Usage Examples

### Analyze Trends
```bash
curl -X POST "http://localhost:8000/api/analyze-trends" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["Dune Part Two", "Oppenheimer movie"]
  }'
```

### Health Check
```bash
curl "http://localhost:8000/health"
```

## 📊 Response Format

### Successful Analysis
```json
{
  "success": true,
  "program_is_trending": true,
  "program": {
    "title": "Dune: Part Two",
    "program_type": "movie",
    "release_year": 2024,
    "description": "Paul Atreides unites with Chani...",
    "cast": ["Timothée Chalamet", "Zendaya"],
    "explanation_of_trend": "Latest blockbuster sequel...",
    "imdb_id": "tt15398776",
    "poster_path": null
  },
  "message": "Successfully identified trending program"
}
```

### No Trending Program Found
```json
{
  "success": true,
  "program_is_trending": false,
  "program": null,
  "message": "No trending program found for the given keywords"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Agent analysis failed",
  "message": "Agent analysis failed"
}
```

## 🔗 Frontend Integration

The React frontend automatically connects to this backend API. Make sure:

1. Backend is running on `http://localhost:8000`
2. Frontend is running on `http://localhost:5173` or `http://localhost:5174`
3. CORS is enabled (already configured in the API)

## 🐛 Troubleshooting

### Agent Not Found
- Make sure `agent.py` is in the `binge-trend-agent/` directory
- Check that the `TrendAgent` class can be imported
- Verify all agent dependencies are installed

### Connection Issues
- Check if port 8000 is available
- Ensure no firewall is blocking the connection
- Verify the frontend is pointing to the correct API URL

### API Errors
- Check the server logs for detailed error messages
- Use the `/docs` endpoint to test API calls
- Verify the agent is working independently

## 🛠️ Development

### Adding New Endpoints
1. Add the endpoint to `backend_api.py`
2. Update the frontend API service in `frontend/src/services/api.js`
3. Test with the Swagger UI at `/docs`

### Debugging
- Enable debug mode by setting `reload=True` in uvicorn
- Check server logs for agent execution details
- Use the health endpoint to verify agent availability

## 📝 Notes

- The API handles both successful agent responses and errors gracefully
- CORS is configured to allow frontend connections
- The agent is called asynchronously to prevent blocking
- All agent errors are caught and returned as proper HTTP responses
