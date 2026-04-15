import React, { useState, useEffect } from 'react';
import axios from 'axios';

function JobScanner({ onUpdate }) {
  const [jobs, setJobs] = useState([]);
  const [formData, setFormData] = useState({
    company: '',
    title: '',
    url: '',
    description: '',
    requirements: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/jobs?status=discovered');
      setJobs(res.data);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await axios.post('http://localhost:5000/api/jobs', {
        ...formData,
        matchScore: Math.random() * 100
      });
      setMessage({ type: 'success', text: 'Job added successfully!' });
      setFormData({ company: '', title: '', url: '', description: '', requirements: '' });
      fetchJobs();
      onUpdate();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Error adding job: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>🔍 Job Scanner</h2>
      <p>Discover and add new job opportunities</p>

      <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="form-group">
          <label>Company Name *</label>
          <input
            type="text"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Job Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Job URL</label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Job Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Requirements</label>
          <textarea
            value={formData.requirements}
            onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
          />
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Adding...' : 'Add Job'}
        </button>
      </form>

      <h3>Discovered Jobs</h3>
      {jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-text">No jobs discovered yet</div>
        </div>
      ) : (
        jobs.map((job) => (
          <div key={job.id} className="job-item">
            <h3>{job.title}</h3>
            <p><strong>Company:</strong> {job.company}</p>
            {job.url && <p><a href={job.url} target="_blank" rel="noopener noreferrer">View Job →</a></p>}
            <div className="meta">
              <span>Match Score: <span className="match-score match-high">{Math.round(job.matchScore)}%</span></span>
              <span>Status: {job.status}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default JobScanner;