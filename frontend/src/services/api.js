// API service for communicating with the backend
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';
const TMDB_API_KEY = '7fc8f0784594d9068ac175ff860bfe75';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 300 seconds timeout for agent processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Agent API calls
export const agentAPI = {
  // Analyze trending keywords using the agent
  analyzeTrends: async (keywords, clientId = null) => {
    try {
      const params = clientId ? { client_id: clientId } : {};
      const response = await api.post('/api/analyze-trends', {
        keywords: keywords
      }, { params });
      return response.data;
    } catch (error) {
      console.error('Error analyzing trends:', error);
      throw new Error(error.response?.data?.detail || 'Failed to analyze trends');
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error('Backend is not available');
    }
  }
};

// TMDB API calls
export const tmdbAPI = {
  // Search for movie by IMDB ID
  getMovieByImdbId: async (imdbId) => {
    console.log('TMDB API: getMovieByImdbId called with:', imdbId);
    
    if (!TMDB_API_KEY) {
      console.error('TMDB API key not configured');
      throw new Error('TMDB API key not configured');
    }

    try {
      // First, find TMDB movie ID from IMDB ID
      const findResponse = await axios.get(
        `https://api.themoviedb.org/3/find/${imdbId}`,
        {
          params: {
            api_key: TMDB_API_KEY,
            external_source: 'imdb_id'
          }
        }
      );

      const movieResults = findResponse.data.movie_results;
      if (!movieResults || movieResults.length === 0) {
        throw new Error('Movie not found in TMDB');
      }

      const tmdbId = movieResults[0].id;

      // Get detailed movie information
      const detailsResponse = await axios.get(
        `https://api.themoviedb.org/3/movie/${tmdbId}`,
        {
          params: {
            api_key: TMDB_API_KEY,
            append_to_response: 'credits,videos,images'
          }
        }
      );

      return {
        ...detailsResponse.data,
        tmdb_id: tmdbId,
        imdb_id: imdbId
      };
    } catch (error) {
      console.error('Error fetching movie details from TMDB:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // More specific error messages
      if (error.response?.status === 401) {
        throw new Error('Invalid TMDB API key');
      } else if (error.response?.status === 404) {
        throw new Error('Movie not found in TMDB database');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new Error('Network error - unable to connect to TMDB');
      } else {
        throw new Error(error.response?.data?.status_message || 'Failed to fetch movie details');
      }
    }
  },

  // Search for TV show by IMDB ID
  getTVShowByImdbId: async (imdbId) => {
    if (!TMDB_API_KEY) {
      throw new Error('TMDB API key not configured');
    }

    try {
      // First, find TMDB TV show ID from IMDB ID
      const findResponse = await axios.get(
        `https://api.themoviedb.org/3/find/${imdbId}`,
        {
          params: {
            api_key: TMDB_API_KEY,
            external_source: 'imdb_id'
          }
        }
      );

      const tvResults = findResponse.data.tv_results;
      if (!tvResults || tvResults.length === 0) {
        throw new Error('TV show not found in TMDB');
      }

      const tmdbId = tvResults[0].id;

      // Get detailed TV show information
      const detailsResponse = await axios.get(
        `https://api.themoviedb.org/3/tv/${tmdbId}`,
        {
          params: {
            api_key: TMDB_API_KEY,
            append_to_response: 'credits,videos,images'
          }
        }
      );

      return {
        ...detailsResponse.data,
        tmdb_id: tmdbId,
        imdb_id: imdbId
      };
    } catch (error) {
      console.error('Error fetching TV show details from TMDB:', error);
      throw new Error(error.response?.data?.status_message || 'Failed to fetch TV show details');
    }
  },

  // Get poster image URL
  getPosterUrl: (posterPath, size = 'w500') => {
    if (!posterPath) return null;
    return `https://image.tmdb.org/t/p/${size}${posterPath}`;
  },

  // Get backdrop image URL
  getBackdropUrl: (backdropPath, size = 'w1280') => {
    if (!backdropPath) return null;
    return `https://image.tmdb.org/t/p/${size}${backdropPath}`;
  }
};

// Utility functions
export const utils = {
  // Format TMDB movie data for our component
  formatMovieData: (tmdbData) => {
    return {
      id: tmdbData.id,
      title: tmdbData.title,
      overview: tmdbData.overview,
      poster_path: tmdbData.poster_path,
      backdrop_path: tmdbData.backdrop_path,
      release_date: tmdbData.release_date,
      vote_average: tmdbData.vote_average,
      vote_count: tmdbData.vote_count,
      runtime: tmdbData.runtime,
      genres: tmdbData.genres || [],
      production_companies: tmdbData.production_companies || [],
      imdb_id: tmdbData.imdb_id,
      tmdb_id: tmdbData.tmdb_id,
      budget: tmdbData.budget,
      revenue: tmdbData.revenue,
      status: tmdbData.status,
      tagline: tmdbData.tagline
    };
  },

  // Format TMDB TV show data for our component
  formatTVData: (tmdbData) => {
    return {
      id: tmdbData.id,
      title: tmdbData.name,
      overview: tmdbData.overview,
      poster_path: tmdbData.poster_path,
      backdrop_path: tmdbData.backdrop_path,
      first_air_date: tmdbData.first_air_date,
      last_air_date: tmdbData.last_air_date,
      vote_average: tmdbData.vote_average,
      vote_count: tmdbData.vote_count,
      number_of_episodes: tmdbData.number_of_episodes,
      number_of_seasons: tmdbData.number_of_seasons,
      genres: tmdbData.genres || [],
      production_companies: tmdbData.production_companies || [],
      imdb_id: tmdbData.imdb_id,
      tmdb_id: tmdbData.tmdb_id,
      status: tmdbData.status,
      tagline: tmdbData.tagline,
      created_by: tmdbData.created_by || []
    };
  },

  // Get cast members from TMDB data
  getCastMembers: (tmdbData, limit = 5) => {
    if (!tmdbData.credits?.cast) return [];
    return tmdbData.credits.cast
      .slice(0, limit)
      .map(actor => ({
        name: actor.name,
        character: actor.character,
        profile_path: actor.profile_path
      }));
  },

  // Get crew members from TMDB data
  getCrewMembers: (tmdbData, job = 'Director', limit = 3) => {
    if (!tmdbData.credits?.crew) return [];
    return tmdbData.credits.crew
      .filter(person => person.job === job)
      .slice(0, limit)
      .map(person => ({
        name: person.name,
        job: person.job
      }));
  }
};

export default api;
