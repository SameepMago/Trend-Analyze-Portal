import React, { useState, useRef } from 'react';
import { TrendingUp, Upload, FileText, X, Loader2 } from 'lucide-react';
import TrendResults from './TrendResults';

const UploadCSVTab = ({ 
  isActive,
  onMovieClick,
  onOpenLogs,
  loadingMovieId,
  onAnalyze
}) => {
  const fileInputRef = useRef(null);
  const [uploadedCSV, setUploadedCSV] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trendResults, setTrendResults] = useState([]);
  const [processingStatus, setProcessingStatus] = useState([]);
  const [error, setError] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target.result;
      parseCSV(csvText);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvText) => {
    try {
      const lines = csvText.split('\n');
      const trends = [];
      let trendBreakdownColumnIndex = -1;
      
      lines.forEach((line, index) => {
        if (line.trim()) {
          const columns = parseCSVLine(line);
          
          if (index === 0) {
            trendBreakdownColumnIndex = columns.findIndex(col => 
              col.toLowerCase() === 'trend breakdown'
            );
            
            if (trendBreakdownColumnIndex === -1) {
              alert('CSV file must have a "Trend breakdown" column. Please check your CSV format.');
              return;
            }
          } else {
            if (trendBreakdownColumnIndex >= 0 && columns[trendBreakdownColumnIndex]) {
              const trendValue = columns[trendBreakdownColumnIndex].trim();
              if (trendValue) {
                trends.push(trendValue);
              }
            }
          }
        }
      });
      
      if (trends.length === 0) {
        alert('No trend data found in the "Trend breakdown" column.');
        return;
      }
      
      setUploadedCSV(trends.join('\n'));
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please check the format and try again.');
    }
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const clearImportedFile = () => {
    setUploadedFileName(null);
    setUploadedCSV('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!uploadedCSV.trim()) {
      setError('Please upload a CSV file first.');
      return;
    }
    setError(null);
    onAnalyze(uploadedCSV, setIsLoading, setTrendResults, setProcessingStatus, setError);
  };

  if (!isActive) return null;

  return (
    <div className="tab-page">
      <form onSubmit={handleSubmit} className="keyword-form">
        <div className="form-group">
          <label className="form-label">
            <Upload className="label-icon" />
            Upload CSV File
          </label>
          
          <div className="csv-upload-section">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            
            {!uploadedFileName ? (
              <>
                <button
                  type="button"
                  onClick={triggerFileUpload}
                  className="csv-upload-btn"
                  disabled={isLoading}
                >
                  <Upload className="btn-icon" />
                  Import CSV
                </button>
                <small className="csv-help">
                  Upload a CSV file with "Trend breakdown" column. Each row will become one trend line.
                </small>
              </>
            ) : (
              <div className="csv-imported-file">
                <div className="file-info">
                  <FileText className="file-icon" />
                  <div className="file-details">
                    <span className="file-name">{uploadedFileName}</span>
                    <span className="file-status">Successfully imported</span>
                  </div>
                </div>
                <div className="file-actions">
                  <button
                    type="button"
                    onClick={triggerFileUpload}
                    className="reupload-btn"
                    disabled={isLoading}
                    title="Upload different file"
                  >
                    <Upload className="btn-icon" />
                    Re-upload
                  </button>
                  <button
                    type="button"
                    onClick={clearImportedFile}
                    className="clear-btn"
                    disabled={isLoading}
                    title="Remove imported file"
                  >
                    <X className="btn-icon" />
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <textarea
            id="keywords"
            value={uploadedCSV}
            onChange={(e) => setUploadedCSV(e.target.value)}
            placeholder="Trends from uploaded CSV will appear here..."
            className="keyword-input"
            rows="8"
            disabled={isLoading}
          />
          <small className="form-help">
            <strong>CSV Format:</strong> Your CSV must have a "Trend breakdown" column. Each row's trend will be added to the input box.
          </small>
        </div>
        
        <button 
          type="submit" 
          className="analyze-btn"
          disabled={isLoading || !uploadedCSV.trim()}
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

export default UploadCSVTab;

