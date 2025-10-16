import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Search, Loader2, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import ProgramCard from './ProgramCard';

const TrendResultItem = ({ 
  trendResult, 
  index, 
  processingStatus, 
  onMovieClick,
  onOpenLogs,
  loadingMovieId 
}) => {
  const [isKeywordsExpanded, setIsKeywordsExpanded] = useState(false);
  
  const keywords = trendResult?.keywords || 'Processing...';
  const maxLength = 80; // Characters to show before truncating
  return (
    <div className="trend-result-item">
      <div className="trend-header">
        <div className="trend-keywords">
          <div className="keywords-content">
            <strong>Trend {index + 1}:</strong> 
            <span className={`keywords-text ${isKeywordsExpanded ? 'expanded' : 'collapsed'}`}>
              {isKeywordsExpanded ? keywords : (keywords.length > maxLength ? keywords.substring(0, maxLength) + '...' : keywords)}
            </span>
            {keywords.length > maxLength && (
              <button 
                className="keywords-expand-btn"
                onClick={() => setIsKeywordsExpanded(!isKeywordsExpanded)}
                title={isKeywordsExpanded ? "Show less" : "Show more"}
              >
                {isKeywordsExpanded ? (
                  <>
                    <ChevronUp className="expand-icon" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="expand-icon" />
                    Show more
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <div className="trend-status-indicator">
          {processingStatus[index] === 'processing' && (
            <div className="status-processing">
              <Loader2 className="status-icon spinning" />
              Processing...
            </div>
          )}
          {processingStatus[index] === 'completed' && trendResult.result && (
            <div className={`status-completed ${
              trendResult.result.success 
                ? (trendResult.result.program_is_trending ? 'trending' : 'not-trending')
                : 'error'
            }`}>
              {trendResult.result.success ? (
                trendResult.result.program_is_trending ? (
                  <>
                    <TrendingUp className="status-icon" />
                    Trending Found
                  </>
                ) : trendResult.result.program ? (
                  <>
                    <TrendingDown className="status-icon" />
                    Not Trending
                  </>
                ) : (
                  <>
                    <Search className="status-icon" />
                    No Program Found
                  </>
                )
              ) : (
                <>
                  <Search className="status-icon" />
                  Agent Error
                </>
              )}
            </div>
          )}
          {processingStatus[index] === 'error' && (
            <div className="status-error">
              <Search className="status-icon" />
              Error
            </div>
          )}
        </div>
        {trendResult?.processedAt && (
          <div className="trend-timestamp">
            Processed at {trendResult.processedAt}
          </div>
        )}
        <div className="trend-actions">
          <button 
            className="log-viewer-btn"
            onClick={() => onOpenLogs(trendResult?.clientId || `trend-${index}`)}
            title="View Live Logs"
          >
            <Terminal size={16} />
            Live Logs
          </button>
        </div>
      </div>

      {processingStatus[index] === 'completed' && trendResult.result && (
        <div className="trend-content">
          {/* Show program card if we have a successful result with a program */}
          {trendResult.result.success && trendResult.result.program && (
            <>
              {loadingMovieId === (trendResult.result.program.imdb_id || trendResult.result.program.title) ? (
                <div className="program-card-loading">
                  <div className="loading-content">
                    <Loader2 className="loading-spinner" />
                    <h3>Loading movie details...</h3>
                    <p>Fetching information from TMDB</p>
                  </div>
                </div>
              ) : (
                <ProgramCard
                  program={trendResult.result.program}
                  onClick={onMovieClick}
                  isTrending={trendResult.result.program_is_trending}
                />
              )}
            </>
          )}

          {/* Show no program found message */}
          {trendResult.result.success && !trendResult.result.program && (
            <div className="no-results">
              <Search className="no-results-icon" />
              <p>{trendResult.result.message || "No entertainment program found for these keywords."}</p>
            </div>
          )}

          {/* Show agent error message */}
          {!trendResult.result.success && trendResult.result.error && (
            <div className="error-message-small">
              <p><strong>Agent Error:</strong> {trendResult.result.error}</p>
            </div>
          )}
        </div>
      )}

      {processingStatus[index] === 'error' && trendResult?.error && (
        <div className="error-message-small">
          <p>{trendResult.error}</p>
        </div>
      )}
    </div>
  );
};

export default TrendResultItem;
