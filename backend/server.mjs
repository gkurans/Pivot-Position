import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const DB_PATH = path.join(dbDir, 'career.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('❌ Database connection error:', err);
  else console.log('✅ Connected to SQLite database');
});

const initializeDatabase = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jobId TEXT UNIQUE,
        company TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT,
        description TEXT,
        requirements TEXT,
        matchScore REAL DEFAULT 0,
        status TEXT DEFAULT 'discovered',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        appliedAt DATETIME,
        recruiterName TEXT,
        recruiterEmail TEXT,
        recruiterLinkedIn TEXT,
        isActivelyRecruiting INTEGER DEFAULT 1
      )
    `, (err) => {
      if (err) console.error('Error creating jobs table:', err);
      else console.log('✅ Jobs table ready');
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jobId INTEGER NOT NULL,
        status TEXT DEFAULT 'draft',
        customCV TEXT,
        customProfile TEXT,
        coverLetter TEXT,
        initialMessage TEXT,
        applicationData TEXT,
        appliedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) console.error('Error creating applications table:', err);
      else console.log('✅ Applications table ready');
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        applicationId INTEGER NOT NULL,
        documentType TEXT,
        fileName TEXT,
        filePath TEXT,
        fileSize INTEGER,
        uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (applicationId) REFERENCES applications(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) console.error('Error creating documents table:', err);
      else console.log('✅ Documents table ready');
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS job_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jobId INTEGER NOT NULL,
        matchedSkills TEXT,
        missingSkills TEXT,
        matchPercentage REAL,
        analysisNotes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) console.error('Error creating job_matches table:', err);
      else console.log('✅ Job matches table ready');
    });
  });
};

initializeDatabase();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/jobs', (req, res) => {
  const { status, sortBy } = req.query;
  let query = 'SELECT * FROM jobs';
  const params = [];

  if (status && status !== 'all') {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY ';
  if (sortBy === 'matchScore') query += 'matchScore DESC';
  else query += 'createdAt DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('/api/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  db.get('SELECT * FROM jobs WHERE id = ?', [jobId], (err, job) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    db.get('SELECT * FROM job_matches WHERE jobId = ?', [jobId], (err, match) => {
      res.json({ job, match });
    });
  });
});

app.post('/api/jobs', (req, res) => {
  const { company, title, url, description, requirements, matchScore } = req.body;
  
  if (!company || !title) {
    return res.status(400).json({ error: 'Company and title are required' });
  }

  const jobId = `${company.replace(/\s+/g, '-')}-${title.replace(/\s+/g, '-')}-${Date.now()}`;

  db.run(
    `INSERT INTO jobs (jobId, company, title, url, description, requirements, matchScore)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [jobId, company, title, url || '', description || '', requirements || '', matchScore || 0],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, jobId });
    }
  );
});

app.patch('/api/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const { status, recruiterName, recruiterEmail, recruiterLinkedIn, isActivelyRecruiting } = req.body;

  let query = 'UPDATE jobs SET ';
  const updates = [];
  const params = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);
    if (status === 'applied') {
      updates.push('appliedAt = CURRENT_TIMESTAMP');
    }
  }
  if (recruiterName) {
    updates.push('recruiterName = ?');
    params.push(recruiterName);
  }
  if (recruiterEmail) {
    updates.push('recruiterEmail = ?');
    params.push(recruiterEmail);
  }
  if (recruiterLinkedIn) {
    updates.push('recruiterLinkedIn = ?');
    params.push(recruiterLinkedIn);
  }
  if (isActivelyRecruiting !== undefined) {
    updates.push('isActivelyRecruiting = ?');
    params.push(isActivelyRecruiting ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  query += updates.join(', ') + ' WHERE id = ?';
  params.push(jobId);

  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes });
  });
});

app.delete('/api/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;

  db.run('DELETE FROM jobs WHERE id = ?', [jobId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

app.post('/api/applications', (req, res) => {
  const { jobId, customCV, customProfile, coverLetter, initialMessage } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required' });
  }

  db.run(
    `INSERT INTO applications (jobId, customCV, customProfile, coverLetter, initialMessage, status)
     VALUES (?, ?, ?, ?, ?, 'draft')`,
    [jobId, customCV || '', customProfile || '', coverLetter || '', initialMessage || ''],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.get('/api/applications/:jobId', (req, res) => {
  const { jobId } = req.params;

  db.get(
    'SELECT * FROM applications WHERE jobId = ? ORDER BY createdAt DESC LIMIT 1',
    [jobId],
    (err, app) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(app || {});
    }
  );
});

app.patch('/api/applications/:appId', (req, res) => {
  const { appId } = req.params;
  const { status, customCV, customProfile, coverLetter, initialMessage, applicationData } = req.body;

  let query = 'UPDATE applications SET ';
  const updates = [];
  const params = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);
    if (status === 'applied') {
      updates.push('appliedAt = CURRENT_TIMESTAMP');
    }
  }
  if (customCV) {
    updates.push('customCV = ?');
    params.push(customCV);
  }
  if (customProfile) {
    updates.push('customProfile = ?');
    params.push(customProfile);
  }
  if (coverLetter) {
    updates.push('coverLetter = ?');
    params.push(coverLetter);
  }
  if (initialMessage) {
    updates.push('initialMessage = ?');
    params.push(initialMessage);
  }
  if (applicationData) {
    updates.push('applicationData = ?');
    params.push(JSON.stringify(applicationData));
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  query += updates.join(', ') + ' WHERE id = ?';
  params.push(appId);

  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post('/api/documents', upload.single('file'), (req, res) => {
  const { applicationId, documentType } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!applicationId) return res.status(400).json({ error: 'applicationId is required' });

  db.run(
    `INSERT INTO documents (applicationId, documentType, fileName, filePath, fileSize)
     VALUES (?, ?, ?, ?, ?)`,
    [applicationId, documentType || 'other', file.originalname, file.path, file.size],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, fileName: file.originalname });
    }
  );
});

app.get('/api/applied-jobs', (req, res) => {
  const query = `
    SELECT 
      j.id,
      j.company,
      j.title,
      j.url,
      j.status,
      j.appliedAt,
      j.recruiterName,
      j.recruiterEmail,
      j.isActivelyRecruiting,
      a.id as applicationId,
      a.customCV,
      a.initialMessage,
      COUNT(d.id) as documentCount
    FROM jobs j
    LEFT JOIN applications a ON j.id = a.jobId
    LEFT JOIN documents d ON a.id = d.applicationId
    WHERE j.status = 'applied'
    GROUP BY j.id
    ORDER BY j.appliedAt DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('/api/documents/:applicationId', (req, res) => {
  const { applicationId } = req.params;

  db.all(
    'SELECT * FROM documents WHERE applicationId = ? ORDER BY uploadedAt DESC',
    [applicationId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

app.get('/api/stats', (req, res) => {
  db.all(`
    SELECT 
      status,
      COUNT(*) as count
    FROM jobs
    GROUP BY status
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const stats = {
      discovered: 0,
      matched: 0,
      applied: 0,
    };
    
    rows?.forEach(row => {
      if (row.status === 'discovered') stats.discovered = row.count;
      if (row.status === 'matched') stats.matched = row.count;
      if (row.status === 'applied') stats.applied = row.count;
    });
    
    res.json(stats);
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Career Dashboard API running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${DB_PATH}`);
  console.log(`📁 Uploads: ${uploadDir}\n`);
});