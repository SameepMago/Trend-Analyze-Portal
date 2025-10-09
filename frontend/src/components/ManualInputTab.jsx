import React, { useState } from 'react';
import { TrendingUp, Search, Loader2 } from 'lucide-react';
import TrendResults from './TrendResults';

const ManualInputTab = ({ 
  isActive,
  onMovieClick,
  onOpenLogs,
  loadingMovieId,
  onAnalyze
}) => {
  const [manualInput, setManualInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trendResults, setTrendResults] = useState([]);
  const [processingStatus, setProcessingStatus] = useState([]);
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) {
      setError('Please enter some trending keywords.');
      return;
    }
    setError(null);
    onAnalyze(manualInput, setIsLoading, setTrendResults, setProcessingStatus, setError);
  };

  if (!isActive) return null;

  return (
    <div className="tab-page">
      <form onSubmit={handleSubmit} className="keyword-form">
        <div className="form-group">
          <label htmlFor="keywords" className="form-label">
            <Search className="label-icon" />
            Enter Trending Keywords
          </label>
          
          <textarea
            id="keywords"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder={`Enter trending keywords (one set per line):
Dune Part Two, Timothee Chalamet, Zendaya
Oppenheimer movie, Christopher Nolan
Netflix trending shows
Barbie movie, Margot Robbie`}
            className="keyword-input"
            rows="8"
            disabled={isLoading}
          />
          <small className="form-help">
            <strong>Multiple Trends:</strong> Enter each trend set on a new line. Keywords within each line should be comma-separated.
            <br />
            <strong>Example:</strong> Line 1: "Dune Part Two, Timothee Chalamet" | Line 2: "Oppenheimer movie"
          </small>
        </div>
        
        <button 
          type="submit" 
          className="analyze-btn"
          disabled={isLoading || !manualInput.trim()}
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

export default ManualInputTab;

