import React, { useState, useEffect } from 'react';
import './App.css';
import JobScanner from './components/JobScanner';
import JobMatcher from './components/JobMatcher';
import ApplicationBuilder from './components/ApplicationBuilder';
import AppliedJobsTracker from './components/AppliedJobsTracker';

function App() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [stats, setStats] = useState({ discovered: 0, matched: 0, applied: 0 });

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const onUpdate = () => {
    fetchStats();
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>Career Dashboard</h1>
            <p>AI-Powered Job Application Management</p>
          </div>
          <div className="header-right">
            <p className="name">Gigi Kurian</p>
            <p className="title">Director – AI Transformation</p>
          </div>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <p className="stat-label">Discovered</p>
          <p className="stat-value">{stats.discovered}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <p className="stat-label">Matched</p>
          <p className="stat-value">{stats.matched}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <p className="stat-label">Applied</p>
          <p className="stat-value">{stats.applied}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <p className="stat-label">Success Rate</p>
          <p className="stat-value">
            {stats.discovered > 0 ? Math.round((stats.applied / stats.discovered) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="main-content">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => setActiveTab('scanner')}
          >
            🔍 Scanner
          </button>
          <button 
            className={`tab ${activeTab === 'matcher' ? 'active' : ''}`}
            onClick={() => setActiveTab('matcher')}
          >
            📊 Matcher
          </button>
          <button 
            className={`tab ${activeTab === 'builder' ? 'active' : ''}`}
            onClick={() => setActiveTab('builder')}
          >
            📝 Builder
          </button>
          <button 
            className={`tab ${activeTab === 'tracker' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracker')}
          >
            ✅ Tracker
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'scanner' && <JobScanner onUpdate={onUpdate} />}
          {activeTab === 'matcher' && <JobMatcher onUpdate={onUpdate} />}
          {activeTab === 'builder' && <ApplicationBuilder onUpdate={onUpdate} />}
          {activeTab === 'tracker' && <AppliedJobsTracker />}
        </div>
      </div>
    </div>
  );
}

export default App;