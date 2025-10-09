import React, { useRef, useState } from 'react';
import { TrendingUp, Search, Loader2, Upload, FileText, X, Download } from 'lucide-react';

const TrendInput = ({ 
  trendingKeywords, 
  setTrendingKeywords, 
  isLoading, 
  onSubmit,
  activeTab,
  setActiveTab
}) => {
  const fileInputRef = useRef(null);

  // Separate state for each tab
  const [manualInput, setManualInput] = useState('');
  const [uploadedCSV, setUploadedCSV] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [googleTrends, setGoogleTrends] = useState('');
  const [googleTrendsCount, setGoogleTrendsCount] = useState(10);
  const [isFetchingTrends, setIsFetchingTrends] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Get keywords based on active tab
    let keywordsToUse = '';
    if (activeTab === 'manual') {
      keywordsToUse = manualInput;
    } else if (activeTab === 'upload') {
      keywordsToUse = uploadedCSV;
    } else if (activeTab === 'fetch') {
      keywordsToUse = googleTrends;
    }
    
    if (!keywordsToUse.trim()) {
      return; // Don't submit if no keywords
    }
    
    // Pass keywords directly to onSubmit
    onSubmit(activeTab, keywordsToUse);
  };

  const handleFetchGoogleTrends = async () => {
    if (googleTrendsCount < 1 || googleTrendsCount > 100) {
      setFetchError('Please enter a number between 1 and 100');
      return;
    }

    setIsFetchingTrends(true);
    setFetchError(null);

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
        const trendsText = data.trends.join('\n');
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
          // Parse CSV with proper handling of quoted values
          const columns = parseCSVLine(line);
          
          // Find the "Trend breakdown" column index from header row
          if (index === 0) {
            trendBreakdownColumnIndex = columns.findIndex(col => 
              col.toLowerCase() === 'trend breakdown'
            );
            
            if (trendBreakdownColumnIndex === -1) {
              alert('CSV file must have a "Trend breakdown" column. Please check your CSV format.');
              return;
            }
          } else {
            // Extract only the "Trend Breakdown" column value
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
      
      // Set the trends in the upload CSV state (one per line)
      setUploadedCSV(trends.join('\n'));
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please check the format and try again.');
    }
  };

  // Helper function to parse CSV line with proper quote handling
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
    
    // Add the last field
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


  return (
    <section className="input-section">
      <form onSubmit={handleSubmit} className="keyword-form">
        {/* Tabs for different input methods */}
        <div className="input-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
            disabled={isLoading}
          >
            <Search className="tab-icon" />
            Manual Input
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
            disabled={isLoading}
          >
            <Upload className="tab-icon" />
            Upload CSV
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'fetch' ? 'active' : ''}`}
            onClick={() => setActiveTab('fetch')}
            disabled={isLoading}
          >
            <TrendingUp className="tab-icon" />
            Fetch Google Trends
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Manual Input Tab */}
          {activeTab === 'manual' && (
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
          )}

          {/* Upload CSV Tab */}
          {activeTab === 'upload' && (
            <div className="form-group">
              <label className="form-label">
                <Upload className="label-icon" />
                Upload CSV File
              </label>
              
              {/* CSV Upload Section */}
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
          )}

          {/* Fetch Google Trends Tab */}
          {activeTab === 'fetch' && (
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
          )}
        </div>
        <button 
          type="submit" 
          className="analyze-btn"
          disabled={isLoading || (
            activeTab === 'manual' && !manualInput.trim() ||
            activeTab === 'upload' && !uploadedCSV.trim() ||
            activeTab === 'fetch' && !googleTrends.trim()
          )}
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
      </form>
    </section>
  );
};

export default TrendInput;
