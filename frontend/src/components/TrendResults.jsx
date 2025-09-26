import React from 'react';
import TrendResultItem from './TrendResultItem';

const TrendResults = ({ 
  trendResults, 
  processingStatus, 
  onMovieClick,
  error,
  loadingMovieId 
}) => {
  if (trendResults.length === 0 && !error) {
    return null;
  }

  return (
    <section className="results-section">
      <div className="results-header">
        <h2>
          Trend Analysis Results
          <span className="results-count">
            ({trendResults.length} trend{trendResults.length !== 1 ? 's' : ''} processed)
          </span>
        </h2>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <div className="trends-list">
        {processingStatus.map((status, index) => (
          <TrendResultItem
            key={index}
            trendResult={trendResults[index] || null}
            index={index}
            processingStatus={processingStatus}
            onMovieClick={onMovieClick}
            loadingMovieId={loadingMovieId}
          />
        ))}
      </div>
    </section>
  );
};

export default TrendResults;
