import React, { useState } from 'react';
import Header from './components/Header';
import TrendInput from './components/TrendInput';
import TrendResults from './components/TrendResults';
import MovieModal from './components/MovieModal';
import ErrorBoundary from './components/ErrorBoundary';
import { tmdbAPI, agentAPI } from './services/api';
import './App.css';

// Main App Component
function App() {
  const [trendingKeywords, setTrendingKeywords] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trendResults, setTrendResults] = useState([]);
  const [processingStatus, setProcessingStatus] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [error, setError] = useState(null);
  const [loadingMovieId, setLoadingMovieId] = useState(null);

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

  // Handle form submission
  const handleSubmit = async () => {
    if (!trendingKeywords.trim()) {
      setError('Please enter some trending keywords.');
      return;
    }
    setError(null);
    setIsLoading(true);
    
    const keywordLines = trendingKeywords.split('\n').filter(line => line.trim() !== '');
    setProcessingStatus(keywordLines.map(() => 'processing'));
    
    // Initialize trendResults with placeholder objects containing keywords
    const initialTrendResults = keywordLines.map(keywords => ({
      keywords: keywords,
      result: null,
      processedAt: null,
      error: null
    }));
    setTrendResults(initialTrendResults);
    
    const newTrendResults = [...initialTrendResults];

    for (let i = 0; i < keywordLines.length; i++) {
      const line = keywordLines[i];
      await processSingleTrend(line, i, newTrendResults);
    }

    setIsLoading(false);
  };

  const processSingleTrend = async (keywords, index, newTrendResults) => {
    try {
      // Call real agent API
      console.log('Calling agent API for:', keywords);
      const agentResult = await agentAPI.analyzeTrends([keywords]);

      const result = {
        keywords: keywords,
        result: agentResult,
        processedAt: new Date().toLocaleTimeString(),
        error: null
      };
      newTrendResults[index] = result;
      setTrendResults([...newTrendResults]);

      setProcessingStatus(prev => {
        const newStatus = [...prev];
        newStatus[index] = 'completed';
        return newStatus;
      });

    } catch (err) {
      console.error('Error processing trend:', err);
      newTrendResults[index] = {
        keywords: keywords,
        result: null,
        processedAt: new Date().toLocaleTimeString(),
        error: err.message || 'Failed to process trend'
      };
      setTrendResults([...newTrendResults]);

      setProcessingStatus(prev => {
        const newStatus = [...prev];
        newStatus[index] = 'error';
        return newStatus;
      });
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

  return (
    <ErrorBoundary>
      <div className="app">
        <Header />

        <main className="app-main">
          <div className="container">
            <TrendInput
              trendingKeywords={trendingKeywords}
              setTrendingKeywords={setTrendingKeywords}
              isLoading={isLoading}
              onSubmit={handleSubmit}
            />

            <TrendResults
              trendResults={trendResults}
              processingStatus={processingStatus}
              onMovieClick={handleMovieClick}
              error={error}
              loadingMovieId={loadingMovieId}
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
      </div>
    </ErrorBoundary>
  );
}

export default App;