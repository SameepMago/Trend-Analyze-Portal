import React, { useState } from 'react';
import Header from './components/Header';
import TrendInputTabs from './components/TrendInputTabs';
import MovieModal from './components/MovieModal';
import LogViewer from './components/LogViewer';
import ErrorBoundary from './components/ErrorBoundary';
import { tmdbAPI, agentAPI } from './services/api';
import './App.css';

// Main App Component
function App() {
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [loadingMovieId, setLoadingMovieId] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logClientId, setLogClientId] = useState(null);
  const [logsByClientId, setLogsByClientId] = useState({});

  // Mock data for testing
  const mockTrendData = {
    "Dune Part Two, Timothee Chalamet": {
      "program_is_trending": true,
      "program": {
        "title": "Dune: Part Two",
        "program_type": "movie",
        "release_year": 2024,
        "description": "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
        "cast": ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Josh Brolin", "Stellan Skarsgård", "Dave Bautista"],
        "explanation_of_trend": "Latest blockbuster sequel with stellar cast and impressive box office performance.",
        "imdb_id": "tt15398776",
        "poster_path": "/d5NXSklXo0qyIYkgV94XAgMIckC.jpg"
      }
    },
    "Oppenheimer movie": {
      "program_is_trending": true,
      "program": {
        "title": "Oppenheimer",
        "program_type": "movie",
        "release_year": 2023,
        "description": "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
        "cast": ["Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr."],
        "explanation_of_trend": "Oscar-winning biopic that dominated awards season and box office.",
        "imdb_id": "tt2283748",
        "poster_path": "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg"
      }
    },
    "Game of Thrones": {
      "program_is_trending": false,
      "program": null
    },
    "Netflix trending shows": {
      "program_is_trending": false,
      "program": {
        "title": "Wednesday",
        "program_type": "show",
        "release_year": 2022,
        "description": "Follows Wednesday Addams' years as a student at Nevermore Academy.",
        "cast": ["Jenna Ortega", "Gwendoline Christie", "Christina Ricci"],
        "explanation_of_trend": "Netflix's viral hit series with massive social media buzz.",
        "imdb_id": "tt13443470",
        "poster_path": "/9PFonBhy4cQy7Jz20NpMygczOkv.jpg"
      }
    }
  };

  // Unified analyze function for all tabs
  const handleAnalyze = async (keywords, setIsLoading, setTrendResults, setProcessingStatus, setError, trendData = null) => {
    if (!keywords.trim()) {
      setError('Please enter some trending keywords.');
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    const keywordLines = keywords.split('\n').filter(line => line.trim() !== '');
    const initialStatus = keywordLines.map(() => 'processing');
    
    const initialTrendResults = keywordLines.map(kw => ({
      keywords: kw,
      result: null,
      processedAt: null,
      error: null
    }));
    
    setTrendResults(initialTrendResults);
    setProcessingStatus(initialStatus);
    
    const newTrendResults = [...initialTrendResults];
    const newStatus = [...initialStatus];

    for (let i = 0; i < keywordLines.length; i++) {
      const line = keywordLines[i];
      await processSingleTrend(line, i, newTrendResults, newStatus, setTrendResults, setProcessingStatus, trendData);
    }

    setIsLoading(false);
  };

  const processSingleTrend = async (keywords, index, newTrendResults, newStatus, setTrendResults, setProcessingStatus, trendData = null) => {
    try {
      // Generate client_id for this trend
      const clientId = `trend-${index}-${Date.now()}`;

      // Store clientId on this trend and initialize logs container
      newTrendResults[index] = {
        ...(newTrendResults[index] || {}),
        clientId,
        logs: [],
      };
      setTrendResults([...newTrendResults]);

      // Open background websocket to collect logs while agent runs
      try {
        const ws = new WebSocket(`ws://localhost:8000/ws/logs/${clientId}`);
        ws.onmessage = (event) => {
          try {
            const log = JSON.parse(event.data);
            setLogsByClientId(prev => {
              const current = prev[clientId] || [];
              return { ...prev, [clientId]: [...current, log] };
            });
            // Also keep logs on trend item for easy access
            const updated = [...newTrendResults];
            const trend = { ...(updated[index] || {}) };
            trend.logs = [...(trend.logs || []), log];
            updated[index] = trend;
            setTrendResults(updated);
          } catch (e) {
            console.error('Failed to parse log message', e);
          }
        };
        ws.onclose = () => {
          // Leave collected logs in state; nothing to do
        };
      } catch (e) {
        console.error('Failed to open WS for logs', e);
      }

      // Call real agent API with client_id
      console.log('Calling agent API for:', keywords, 'with client_id:', clientId);
      const agentResult = await agentAPI.analyzeTrends([keywords], clientId, trendData);

      const result = {
        keywords: keywords,
        result: agentResult,
        processedAt: new Date().toLocaleTimeString(),
        error: null,
        clientId,
        logs: logsByClientId[clientId] || newTrendResults[index]?.logs || [],
      };
      newTrendResults[index] = result;
      newStatus[index] = 'completed';
      
      setTrendResults([...newTrendResults]);
      setProcessingStatus([...newStatus]);

    } catch (err) {
      console.error('Error processing trend:', err);
      newTrendResults[index] = {
        keywords: keywords,
        result: null,
        processedAt: new Date().toLocaleTimeString(),
        error: err.message || 'Failed to process trend'
      };
      newStatus[index] = 'error';
      
      setTrendResults([...newTrendResults]);
      setProcessingStatus([...newStatus]);
    }
  };

  // Handle movie selection and fetch TMDB details
  const handleMovieClick = async (movie) => {
    console.log('=== MOVIE CLICK START ===');
    console.log('Movie clicked:', movie);
    
    // Don't open modal yet, just start loading
    setLoadingMovieId(movie.imdb_id || movie.title);
    setSelectedMovie(null); // Don't show modal yet
    setMovieDetails(null);
    
    // Try to fetch TMDB data
    if (movie.imdb_id) {
      console.log('About to call TMDB API for IMDB ID:', movie.imdb_id);
      
      try {
        console.log('Calling tmdbAPI...');
        
        
        let tmdbData;
        
        if (movie.program_type === 'movie') {
          console.log('Fetching movie data...');
          tmdbData = await tmdbAPI.getMovieByImdbId(movie.imdb_id);
        } else {
          console.log('Fetching TV show data...');
          tmdbData = await tmdbAPI.getTVShowByImdbId(movie.imdb_id);
        }
        
        console.log('TMDB data received:', tmdbData);
        
        if (tmdbData) {
          console.log('Processing TMDB data...');
          const enhancedData = {
            title: tmdbData.title || movie.title,
            overview: tmdbData.overview || movie.description || 'No overview available',
            poster_path: tmdbData.poster_path || movie.poster_path || null,
            release_date: tmdbData.release_date || tmdbData.first_air_date || (movie.release_year ? `${movie.release_year}-01-01` : null),
            vote_average: tmdbData.vote_average || null,
            runtime: tmdbData.runtime || tmdbData.episode_run_time?.[0] || null,
            genres: tmdbData.genres || [],
            production_companies: tmdbData.production_companies || [],
            credits: tmdbData.credits || {
              cast: [],
              crew: []
            }
          };
          
          console.log('Setting TMDB data:', enhancedData);
          setMovieDetails(enhancedData);
          setSelectedMovie(movie); // Now open the modal with data
          setLoadingMovieId(null); // Stop loading
          console.log('MovieDetails state updated to:', enhancedData);
        } else {
          // No TMDB data, use fallback
          console.log('No TMDB data, using fallback');
          const fallbackData = {
            title: movie.title,
            overview: movie.description || 'No description available',
            poster_path: movie.poster_path || null,
            release_date: movie.release_year ? `${movie.release_year}-01-01` : null,
            vote_average: null,
            runtime: null,
            genres: [],
            production_companies: [],
            credits: {
              cast: [],
              crew: []
            }
          };
          setMovieDetails(fallbackData);
          setSelectedMovie(movie); // Open modal with fallback data
          setLoadingMovieId(null); // Stop loading
        }
      } catch (err) {
        console.error('TMDB API error:', err);
        console.error('Error details:', {
          message: err.message,
          stack: err.stack
        });
        
        // Use fallback data on error
        const fallbackData = {
          title: movie.title,
          overview: movie.description || 'No description available',
          poster_path: movie.poster_path || null,
          release_date: movie.release_year ? `${movie.release_year}-01-01` : null,
          vote_average: null,
          runtime: null,
          genres: [],
          production_companies: [],
          credits: {
            cast: [],
            crew: []
          }
        };
        setMovieDetails(fallbackData);
        setSelectedMovie(movie); // Open modal with fallback data
        setLoadingMovieId(null); // Stop loading
      }
    } else {
      // No IMDB ID, use fallback data immediately
      console.log('No IMDB ID, using fallback data');
      const fallbackData = {
        title: movie.title,
        overview: movie.description || 'No description available',
        poster_path: movie.poster_path || null,
        release_date: movie.release_year ? `${movie.release_year}-01-01` : null,
        vote_average: null,
        runtime: null,
        genres: [],
        production_companies: [],
        credits: {
          cast: [],
          crew: []
        }
      };
      setMovieDetails(fallbackData);
      setSelectedMovie(movie); // Open modal with fallback data
      setLoadingMovieId(null); // Stop loading
    }
  };

  const handleOpenLogs = (clientId) => {
    setLogClientId(clientId);
    setShowLogs(true);
  };

  return (
    <ErrorBoundary>
      <div className="app">
        <Header />

        <main className="app-main">
          <div className="container">
            <TrendInputTabs
              onMovieClick={handleMovieClick}
              onOpenLogs={handleOpenLogs}
              loadingMovieId={loadingMovieId}
              onAnalyze={handleAnalyze}
            />
          </div>
        </main>

        <MovieModal 
          selectedMovie={selectedMovie}
          movieDetails={movieDetails}
          onClose={() => {
            setSelectedMovie(null);
            setMovieDetails(null);
          }}
        />
        
        <LogViewer 
          isOpen={showLogs}
          onClose={() => setShowLogs(false)}
          clientId={logClientId}
          initialLogs={(logsByClientId && logClientId && logsByClientId[logClientId]) ? logsByClientId[logClientId] : []}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;