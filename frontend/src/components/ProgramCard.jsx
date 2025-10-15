import React, { useState, useEffect } from 'react';
import { Film, Tv, Calendar, Users, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { tmdbAPI } from '../services/api';

const ProgramCard = ({ program, onClick, isTrending = true }) => {
  const [posterPath, setPosterPath] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoster = async () => {
      if (program.imdb_id) {
        try {
          setLoading(true);
          const tmdbData = program.program_type === 'movie' 
            ? await tmdbAPI.getMovieByImdbId(program.imdb_id)
            : await tmdbAPI.getTVShowByImdbId(program.imdb_id);
          
          if (tmdbData.poster_path) {
            setPosterPath(tmdbData.poster_path);
          }
        } catch (error) {
          console.error('Error fetching poster:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchPoster();
  }, [program.imdb_id, program.program_type]);

  return (
    <div className={`program-card ${isTrending ? 'trending' : 'not-trending'}`} onClick={() => onClick(program)}>
      <div className="movie-details">
        <div className="program-poster">
          {loading ? (
            <div className="poster-loading">
              <Loader2 className="loading-spinner" />
            </div>
          ) : (
            <img 
              src={posterPath 
                ? `https://image.tmdb.org/t/p/w300${posterPath}`
                : 'https://via.placeholder.com/80x120/667eea/ffffff?text=No+Image'
              }
              alt={program.title}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/80x120/667eea/ffffff?text=No+Image';
              }}
            />
          )}
        </div>
        
        <div className="movie-info">
          <h3 className="program-title">{program.title}</h3>
          
          <div className="program-meta">
            <span className="program-type">
              {program.program_type === 'movie' ? 'Movie' : 'TV Show'}
            </span>
            <span className="program-year">
              <Calendar className="meta-icon" />
              {program.release_year}
            </span>
            {program.topic_id && (
              <span className="topic-id">
                Topic ID: {program.topic_id}
              </span>
            )}
          </div>
          
          <div className="program-explanation">
            {isTrending ? (
              <>
                <strong>Why it's trending:</strong> {program.explanation_of_trend}
              </>
            ) : (
              <>
                <strong>Not trending:</strong> {program.explanation_of_trend || 'This program is not currently trending.'}
              </>
            )}
          </div>
          
          <div className="click-hint">
            Click for detailed information →
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramCard;
