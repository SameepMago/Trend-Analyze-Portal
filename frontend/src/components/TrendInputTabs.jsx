import React, { useState } from 'react';
import { Search, Upload, TrendingUp } from 'lucide-react';
import ManualInputTab from './ManualInputTab';
import UploadCSVTab from './UploadCSVTab';
import FetchGoogleTrendsTab from './FetchGoogleTrendsTab';

const TrendInputTabs = ({ 
  onMovieClick,
  onOpenLogs,
  loadingMovieId,
  onAnalyze
}) => {
  const [activeTab, setActiveTab] = useState('manual');

  return (
    <section className="input-section">
      {/* Tabs */}
      <div className="input-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          <Search className="tab-icon" />
          Manual Input
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <Upload className="tab-icon" />
          Upload CSV
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'fetch' ? 'active' : ''}`}
          onClick={() => setActiveTab('fetch')}
        >
          <TrendingUp className="tab-icon" />
          Fetch Google Trends
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        <ManualInputTab 
          isActive={activeTab === 'manual'}
          onMovieClick={onMovieClick}
          onOpenLogs={onOpenLogs}
          loadingMovieId={loadingMovieId}
          onAnalyze={onAnalyze}
        />
        <UploadCSVTab 
          isActive={activeTab === 'upload'}
          onMovieClick={onMovieClick}
          onOpenLogs={onOpenLogs}
          loadingMovieId={loadingMovieId}
          onAnalyze={onAnalyze}
        />
        <FetchGoogleTrendsTab 
          isActive={activeTab === 'fetch'}
          onMovieClick={onMovieClick}
          onOpenLogs={onOpenLogs}
          loadingMovieId={loadingMovieId}
          onAnalyze={onAnalyze}
        />
      </div>
    </section>
  );
};

export default TrendInputTabs;

