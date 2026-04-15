import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AppliedJobsTracker() {
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppliedJobs();
    const interval = setInterval(fetchAppliedJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAppliedJobs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/applied-jobs');
      setAppliedJobs(res.data);
    } catch (err) {
      console.error('Error fetching applied jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading applied jobs...</div>;
  }

  return (
    <div>
      <h2>✅ Applied Jobs Tracker</h2>
      <p>Track all your job applications</p>

      {appliedJobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <div className="empty-state-text">No applications yet</div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px', color: '#666' }}>
            Total Applications: <strong>{appliedJobs.length}</strong>
          </div>
          {appliedJobs.map((job) => (
            <div key={job.id} className="job-item">
              <h3>{job.title}</h3>
              <p><strong>Company:</strong> {job.company}</p>
              {job.recruiterName && <p><strong>Recruiter:</strong> {job.recruiterName}</p>}
              {job.recruiterEmail && <p><strong>Email:</strong> <a href={`mailto:${job.recruiterEmail}`}>{job.recruiterEmail}</a></p>}
              
              <div className="meta">
                <span>Status: <strong>{job.status}</strong></span>
                {job.appliedAt && <span>Applied: {new Date(job.appliedAt).toLocaleDateString()}</span>}
                {job.documentCount > 0 && <span>Documents: {job.documentCount}</span>}
                <span>{job.isActivelyRecruiting ? '🟢 Actively Recruiting' : '⚪ Not Actively Recruiting'}</span>
              </div>

              {job.initialMessage && (
                <div style={{ marginTop: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '6px' }}>
                  <strong>Your Message:</strong>
                  <p style={{ marginTop: '8px', color: '#666' }}>{job.initialMessage}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AppliedJobsTracker;