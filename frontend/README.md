# Trending Program Analyzer - Frontend

A React.js frontend portal for analyzing trending entertainment keywords and discovering movies/TV shows.

## Features

- **Trend Analysis**: Input comma-separated trending keywords to analyze if they relate to entertainment content
- **Real-time Results**: Get instant feedback on whether keywords represent trending movies or TV shows
- **Detailed Information**: Click on results to view comprehensive movie/TV show details
- **TMDB Integration**: Fetches posters, ratings, cast, and other metadata from The Movie Database
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Beautiful gradient design with smooth animations and transitions

## Technology Stack

- **React 18** with TypeScript support
- **Vite** for fast development and building
- **Axios** for HTTP requests
- **Lucide React** for modern icons
- **CSS3** with modern features (gradients, backdrop-filter, etc.)

## Prerequisites

- Node.js 18+ 
- npm or yarn
- TMDB API key (for movie/TV show details)
- Backend API running (agent service)

## Installation

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables in `.env.local`:**
   ```env
   # Backend API URL
   REACT_APP_API_URL=http://localhost:8000
   
   # TMDB API Key (get from https://www.themoviedb.org/settings/api)
   REACT_APP_TMDB_API_KEY=your_tmdb_api_key_here
   ```

## Development

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Open browser:**
   Navigate to `http://localhost:5173`

3. **Start backend API:**
   Make sure the agent backend is running on the configured port (default: 8000)

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

### 1. Input Trending Keywords
- Enter comma-separated keywords in the text area
- Examples: "Dune Part Two", "Timothee Chalamet, Zendaya", "Netflix trending shows"
- Click "Analyze Trends" to process

### 2. View Results
- **Trending Program Found**: Shows movie/TV show details with explanation
- **No Trending Program**: Indicates keywords don't relate to entertainment content

### 3. Get Detailed Information
- Click on any result card to open detailed modal
- View poster, ratings, cast, genres, and more
- Information fetched from TMDB API using IMDB ID

## API Integration

### Backend Agent API
The frontend communicates with the Python agent backend:

- **POST /api/analyze-trends**: Analyze trending keywords
  ```json
  {
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
  ```

- **GET /api/status**: Check agent service health

### TMDB API
Movie/TV show details fetched from The Movie Database:

- **Find by IMDB ID**: Convert IMDB ID to TMDB ID
- **Get Details**: Fetch comprehensive information
- **Images**: Posters and backdrops

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components (future)
│   ├── services/
│   │   └── api.js         # API service layer
│   ├── App.jsx            # Main app component
│   ├── App.css            # Main styles
│   ├── index.css          # Global styles
│   └── main.jsx           # App entry point
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
└── README.md             # This file
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API base URL | `http://localhost:8000` |
| `REACT_APP_TMDB_API_KEY` | TMDB API key for movie details | Required |

## Troubleshooting

### Common Issues

1. **"Failed to analyze trends"**
   - Check if backend API is running
   - Verify `REACT_APP_API_URL` is correct
   - Check browser network tab for API errors

2. **"TMDB API key not configured"**
   - Add `REACT_APP_TMDB_API_KEY` to `.env.local`
   - Get API key from [TMDB Settings](https://www.themoviedb.org/settings/api)

3. **"Movie not found in TMDB"**
   - Some movies may not be in TMDB database
   - IMDB ID might be incorrect
   - Check TMDB website for availability

4. **CORS Issues**
   - Backend needs to allow frontend origin
   - Check backend CORS configuration

### Development Tips

- Use browser dev tools to inspect API calls
- Check console for error messages
- Verify environment variables are loaded
- Test with simple keywords first

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## License

This project is part of the Trending Program Analyzer system.