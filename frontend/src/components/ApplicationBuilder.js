import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ApplicationBuilder({ onUpdate }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [formData, setFormData] = useState({
    customCV: '',
    customProfile: '',
    coverLetter: '',
    initialMessage: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/jobs?status=matched');
      setJobs(res.data);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    setFormData({ customCV: '', customProfile: '', coverLetter: '', initialMessage: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob) {
      setMessage({ type: 'error', text: 'Please select a job first' });
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Create application
      const appRes = await axios.post('http://localhost:5000/api/applications', {
        jobId: selectedJob.id,
        ...formData
      });

      // Update job status
      await axios.patch(`http://localhost:5000/api/jobs/${selectedJob.id}`, {
        status: 'applied'
      });

      setMessage({ type: 'success', text: 'Application submitted successfully!' });
      fetchJobs();
      setSelectedJob(null);
      onUpdate();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Error submitting application: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>📝 Application Builder</h2>
      <p>Build and submit custom applications</p>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {selectedJob ? (
        <div>
          <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
            <h3>{selectedJob.title}</h3>
            <p><strong>Company:</strong> {selectedJob.company}</p>
            <button 
              onClick={() => setSelectedJob(null)} 
              className="btn btn-secondary"
            >
              Change Job
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Custom CV/Resume</label>
              <textarea
                value={formData.customCV}
                onChange={(e) => setFormData({ ...formData, customCV: e.target.value })}
                placeholder="Paste your customized CV for this job..."
              />
            </div>

            <div className="form-group">
              <label>Custom Profile Summary</label>
              <textarea
                value={formData.customProfile}
                onChange={(e) => setFormData({ ...formData, customProfile: e.target.value })}
                placeholder="Tailored profile summary for this position..."
              />
            </div>

            <div className="form-group">
              <label>Cover Letter</label>
              <textarea
                value={formData.coverLetter}
                onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                placeholder="Write a compelling cover letter..."
              />
            </div>

            <div className="form-group">
              <label>Initial Message (for recruiter)</label>
              <textarea
                value={formData.initialMessage}
                onChange={(e) => setFormData({ ...formData, initialMessage: e.target.value })}
                placeholder="Your message to the recruiter..."
              />
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      ) : (
        <div>
          <h3>Select a Job to Apply</h3>
          {jobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">No matched jobs available</div>
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="job-item">
                <h4>{job.title}</h4>
                <p>{job.company}</p>
                <button 
                  onClick={() => handleJobSelect(job)} 
                  className="btn"
                >
                  Select & Apply
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default ApplicationBuilder;