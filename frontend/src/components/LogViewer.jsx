import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Filter, Download, Play, Pause, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

const LogViewer = ({ isOpen, onClose, clientId, initialLogs = [] }) => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isConnected, setIsConnected] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const wsRef = useRef(null);
  const logsEndRef = useRef(null);

  const levels = ['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'];
  const categories = ['ALL', 'AGENT', 'ANALYSIS', 'SEARCH', 'ANALYZE', 'VALIDATE', 'MATCH', 'RESULT', 'ERROR'];

  useEffect(() => {
    // Seed with any existing logs for this trend
    if (Array.isArray(initialLogs) && initialLogs.length > 0) {
      setLogs(initialLogs);
    } else {
      setLogs([]);
    }

    if (isOpen && clientId) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isOpen, clientId, initialLogs]);

  useEffect(() => {
    if (isAutoScroll) {
      scrollToBottom();
    }
  }, [filteredLogs, isAutoScroll]);

  const connectWebSocket = () => {
    console.log(`Attempting to connect to WebSocket: ws://localhost:8000/ws/logs/${clientId}`);
    const ws = new WebSocket(`ws://localhost:8000/ws/logs/${clientId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected successfully');
    };

    ws.onmessage = (event) => {
      const logData = JSON.parse(event.data);
      setLogs(prevLogs => [...prevLogs, logData]);
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  };

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filterLogs = () => {
    let filtered = logs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Level filter
    if (levelFilter !== 'ALL') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // Category filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(log => log.category === categoryFilter);
    }

    setFilteredLogs(filtered);
  };

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, levelFilter, categoryFilter]);

  const getLevelColor = (level) => {
    switch (level) {
      case 'INFO': return '#10b981';
      case 'WARN': return '#f59e0b';
      case 'ERROR': return '#ef4444';
      case 'DEBUG': return '#6b7280';
      default: return '#374151';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'AGENT': return '🤖';
      case 'ANALYSIS': return '📊';
      case 'SEARCH': return '🔍';
      case 'ANALYZE': return '📈';
      case 'VALIDATE': return '✅';
      case 'MATCH': return '🎬';
      case 'RESULT': return '📋';
      case 'ERROR': return '❌';
      default: return '📝';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const exportLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${formatTimestamp(log.timestamp)}] ${log.level} ${log.category}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trend-analysis-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    setLogs([]);
    setFilteredLogs([]);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content log-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="log-viewer-header">
          <div className="log-viewer-title">
            <h3>🔍 Live Agent Logs</h3>
            <div className="connection-status">
              <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          <div className="log-viewer-controls">
            <button 
              className="control-btn" 
              onClick={() => setIsAutoScroll(!isAutoScroll)}
              title={isAutoScroll ? 'Disable Auto-scroll' : 'Enable Auto-scroll'}
            >
              {isAutoScroll ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
            <button className="control-btn" onClick={exportLogs} title="Export Logs">
              <Download size={16} />
            </button>
            <button className="control-btn close-btn" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="log-viewer-filters">
          <div className="filter-group">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="log-search"
            />
          </div>
          <div className="filter-group">
            <Filter size={16} />
            <select 
              value={levelFilter} 
              onChange={(e) => setLevelFilter(e.target.value)}
              className="log-filter"
            >
              {levels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="log-filter"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="log-viewer-content">
          {filteredLogs.length === 0 ? (
            <div className="no-logs">
              <p>No logs to display</p>
              <p className="no-logs-hint">Start a trend analysis to see live logs</p>
            </div>
          ) : (
            <div className="log-entries">
              {filteredLogs.map((log, index) => (
                <div key={index} className="log-entry">
                  <div className="log-timestamp">
                    {formatTimestamp(log.timestamp)}
                  </div>
                  <div className="log-level" style={{ color: getLevelColor(log.level) }}>
                    {log.level}
                  </div>
                  <div className="log-category">
                    {getCategoryIcon(log.category)} {log.category}
                  </div>
                  <div className="log-message">
                    {log.message}
                  </div>
                  {log.data && (
                    <div className="log-data">
                      <details>
                        <summary>Details</summary>
                        <pre>{JSON.stringify(log.data, null, 2)}</pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogViewer;
