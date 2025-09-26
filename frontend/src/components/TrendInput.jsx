import React, { useRef, useState } from 'react';
import { TrendingUp, Search, Loader2, Upload, FileText, X } from 'lucide-react';

const TrendInput = ({ 
  trendingKeywords, 
  setTrendingKeywords, 
  isLoading, 
  onSubmit 
}) => {
  const fileInputRef = useRef(null);
  const [importedFileName, setImportedFileName] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportedFileName(file.name);

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
      
      // Set the trends in the textarea (one per line)
      setTrendingKeywords(trends.join('\n'));
      
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
    setImportedFileName(null);
    setTrendingKeywords('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <section className="input-section">
      <form onSubmit={handleSubmit} className="keyword-form">
        <div className="form-group">
          <label htmlFor="keywords" className="form-label">
            <Search className="label-icon" />
            Enter Trending Keywords
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
            
            {!importedFileName ? (
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
                    <span className="file-name">{importedFileName}</span>
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
            value={trendingKeywords}
            onChange={(e) => setTrendingKeywords(e.target.value)}
            placeholder={`Enter trending keywords (one set per line):
Dune Part Two, Timothee Chalamet, Zendaya
Oppenheimer movie, Christopher Nolan
Netflix trending shows
Barbie movie, Margot Robbie`}
            className="keyword-input"
            rows="5"
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
          disabled={isLoading}
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
