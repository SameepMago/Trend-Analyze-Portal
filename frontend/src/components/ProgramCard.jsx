import React from 'react';
import { Film, Tv, Calendar, Users, TrendingUp, TrendingDown } from 'lucide-react';

const ProgramCard = ({ program, onClick, isTrending = true }) => {
  return (
    <div className={`program-card ${isTrending ? 'trending' : 'not-trending'}`} onClick={() => onClick(program)}>
      <div className="movie-details">
        <div className="program-poster">
          <img 
            src={`https://image.tmdb.org/t/p/w300${program.poster_path || '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg'}`}
            alt={program.title}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/80x120/667eea/ffffff?text=👤';
            }}
          />
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
