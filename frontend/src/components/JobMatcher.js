import React, { useState, useEffect } from 'react';
import axios from 'axios';

function JobMatcher({ onUpdate }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/jobs?status=discovered&sortBy=matchScore');
      setJobs(res.data);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  const handleMatch = async (jobId) => {
    setLoading(true);
    try {
      await axios.patch(`http://localhost:5000/api/jobs/${jobId}`, {
        status: 'matched'
      });
      fetchJobs();
      onUpdate();
    } catch (err) {
      alert('Error updating job: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (score) => {
    if (score >= 75) return 'match-high';
    if (score >= 50) return 'match-medium';
    return 'match-low';
  };

  return (
    <div>
      <h2>📊 Job Matcher</h2>
      <p>Match your skills with job opportunities</p>

      {jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-text">No jobs to match</div>
        </div>
      ) : (
        jobs.map((job) => (
          <div key={job.id} className="job-item">
            <h3>{job.title}</h3>
            <p><strong>Company:</strong> {job.company}</p>
            {job.description && <p><strong>Description:</strong> {job.description.substring(0, 150)}...</p>}
            
            <div className="meta">
              <span>Match Score: <span className={`match-score ${getMatchColor(job.matchScore)}`}>{Math.round(job.matchScore)}%</span></span>
            </div>

            <button 
              onClick={() => handleMatch(job.id)} 
              className="btn"
              disabled={loading}
              style={{ marginTop: '15px' }}
            >
              {loading ? 'Updating...' : 'Mark as Matched'}
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default JobMatcher;