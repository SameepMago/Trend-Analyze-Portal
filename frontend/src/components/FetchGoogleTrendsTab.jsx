import React, { useState } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import TrendResults from './TrendResults';

const FetchGoogleTrendsTab = ({ 
  isActive,
  onMovieClick,
  onOpenLogs,
  loadingMovieId,
  onAnalyze
}) => {
  const [googleTrends, setGoogleTrends] = useState('');
  const [trendData, setTrendData] = useState([]);
  const [googleTrendsCount, setGoogleTrendsCount] = useState(10);
  const [isFetchingTrends, setIsFetchingTrends] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trendResults, setTrendResults] = useState([]);
  const [processingStatus, setProcessingStatus] = useState([]);
  const [error, setError] = useState(null);

  const handleFetchGoogleTrends = async () => {
    if (googleTrendsCount < 1 || googleTrendsCount > 100) {
      setFetchError('Please enter a number between 1 and 100');
      return;
    }

    // Reset UI state when fetching new trends
    setGoogleTrends('');
    setTrendData([]);
    setTrendResults([]);
    setProcessingStatus([]);
    setError(null);
    setFetchError(null);
    setIsLoading(false);

    setIsFetchingTrends(true);

    try {
      const response = await fetch('http://localhost:8000/api/fetch-google-trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ top_n: googleTrendsCount }),
      });

      const data = await response.json();

      if (data.success && data.trends) {
        // Store full trend data objects
        setTrendData(data.trends);
        
        // Extract trend breakdown for display
        const trendsText = data.trends.map(trend => {
          const breakdown = trend.trend_breakdown || [];
          const breakdownText = Array.isArray(breakdown) ? breakdown.join(', ') : breakdown;
          return breakdownText || trend.trends || 'Unknown trend';
        }).join('\n');
        
        setGoogleTrends(trendsText);
      } else {
        setFetchError(data.error || 'Failed to fetch Google Trends');
      }
    } catch (err) {
      console.error('Error fetching Google Trends:', err);
      setFetchError('Failed to fetch Google Trends. Please try again.');
    } finally {
      setIsFetchingTrends(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!googleTrends.trim()) {
      setError('Please fetch Google Trends first.');
      return;
    }
    setError(null);
    onAnalyze(googleTrends, setIsLoading, setTrendResults, setProcessingStatus, setError, trendData);
  };

  if (!isActive) return null;

  return (
    <div className="tab-page">
      <form onSubmit={handleSubmit} className="keyword-form">
        <div className="form-group">
          <div className="google-trends-fetch">
            <div className="google-trends-header">
              <TrendingUp className="google-trends-icon" />
              <h3>Fetch Latest Google Trends</h3>
            </div>
            
            <div className="google-trends-content">
              <p className="google-trends-description">
                Automatically download and analyze the latest trending topics from Google Trends
              </p>
              
              <div className="google-trends-input-group">
                <label htmlFor="topN">Number of Trends:</label>
                <input
                  id="topN"
                  type="number"
                  min="1"
                  max="100"
                  value={googleTrendsCount}
                  onChange={(e) => setGoogleTrendsCount(parseInt(e.target.value) || 1)}
                  disabled={isFetchingTrends || isLoading}
                  className="google-trends-number-input"
                />
              </div>

              <button
                type="button"
                onClick={handleFetchGoogleTrends}
                disabled={isFetchingTrends || isLoading}
                className="google-trends-btn"
              >
                {isFetchingTrends ? (
                  <>
                    <Loader2 className="btn-icon spinning" />
                    Fetching Trends...
                  </>
                ) : (
                  <>
                    <TrendingUp className="btn-icon" />
                    Fetch Google Trends
                  </>
                )}
              </button>

              {fetchError && (
                <div className="google-trends-error">
                  {fetchError}
                </div>
              )}

              {googleTrends && (
                <div className="fetched-trends-preview">
                  <label>Fetched Trends:</label>
                  <textarea
                    value={googleTrends}
                    readOnly
                    className="trends-preview-textarea"
                    rows="8"
                  />
                  <small className="preview-help">
                    ✅ {googleTrends.split('\n').length} trends fetched successfully. Click "Analyze Trends" below to process them.
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <button 
          type="submit" 
          className="analyze-btn"
          disabled={isLoading || !googleTrends.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="btn-icon spinning" />
              Analyzing Trends...
            </>
          ) : (
            <>
              <TrendingUp className="btn-icon" />
              Analyze Trends
            </>
          )}
        </button>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </form>

      <TrendResults
        trendResults={trendResults}
        processingStatus={processingStatus}
        onMovieClick={onMovieClick}
        onOpenLogs={onOpenLogs}
        error={null}
        loadingMovieId={loadingMovieId}
      />
    </div>
  );
};

export default FetchGoogleTrendsTab;

