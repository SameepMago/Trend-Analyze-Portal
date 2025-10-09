import React, { useState } from 'react';
import { TrendingUp, Loader2, Download } from 'lucide-react';

const GoogleTrendsFetch = ({ onTrendsFetched, isDisabled }) => {
  const [topN, setTopN] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetchedTrends, setFetchedTrends] = useState('');

  const handleFetchTrends = async () => {
    if (topN < 1 || topN > 100) {
      setError('Please enter a number between 1 and 100');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/fetch-google-trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ top_n: topN }),
      });

      const data = await response.json();

      if (data.success && data.trends) {
        // Join trends with newlines and fill the input box
        const trendsText = data.trends.join('\n');
        setFetchedTrends(trendsText);
        onTrendsFetched(trendsText);
      } else {
        setError(data.error || 'Failed to fetch Google Trends');
      }
    } catch (err) {
      console.error('Error fetching Google Trends:', err);
      setError('Failed to fetch Google Trends. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
            value={topN}
            onChange={(e) => setTopN(parseInt(e.target.value) || 1)}
            disabled={isLoading || isDisabled}
            className="google-trends-number-input"
          />
        </div>

        <button
          onClick={handleFetchTrends}
          disabled={isLoading || isDisabled}
          className="google-trends-btn"
        >
          {isLoading ? (
            <>
              <Loader2 className="btn-icon spinning" />
              Fetching Trends...
            </>
          ) : (
            <>
              <Download className="btn-icon" />
              Fetch Google Trends
            </>
          )}
        </button>

        {error && (
          <div className="google-trends-error">
            {error}
          </div>
        )}

        {fetchedTrends && (
          <div className="fetched-trends-preview">
            <label>Fetched Trends:</label>
            <textarea
              value={fetchedTrends}
              readOnly
              className="trends-preview-textarea"
              rows="8"
            />
            <small className="preview-help">
              ✅ {fetchedTrends.split('\n').length} trends fetched successfully. These will be analyzed when you click "Analyze Trends" below.
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleTrendsFetch;

