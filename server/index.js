const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { WebsiteCloner } = require('./cloner');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// Store active jobs and their WebSocket connections
const jobs = new Map();
const jobConnections = new Map();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve cloned outputs
app.use('/clone', express.static(path.join(__dirname, '..', 'output')));

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const jobId = url.searchParams.get('jobId');

  if (jobId) {
    // Store connection for this job
    if (!jobConnections.has(jobId)) {
      jobConnections.set(jobId, new Set());
    }
    jobConnections.get(jobId).add(ws);

    console.log(`WebSocket connected for job: ${jobId}`);

    ws.on('close', () => {
      const connections = jobConnections.get(jobId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          jobConnections.delete(jobId);
        }
      }
    });
  }

  ws.on('error', console.error);
});

// Broadcast log to job connections
function broadcastLog(jobId, log) {
  const connections = jobConnections.get(jobId);
  if (connections) {
    const message = JSON.stringify(log);
    connections.forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    });
  }
}

// API Routes

// Start a clone job
app.post('/api/clone', async (req, res) => {
  const { url, headless = true } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const jobId = uuidv4();

  // Create job entry
  jobs.set(jobId, {
    id: jobId,
    url,
    status: 'running',
    startTime: new Date().toISOString(),
    logs: [],
  });

  // Return immediately with job ID
  res.json({ jobId, status: 'running' });

  // Run clone in background
  runCloneJob(jobId, url, headless);
});

// Get job status
app.get('/api/jobs/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

// Run clone job
async function runCloneJob(jobId, url, headless) {
  const job = jobs.get(jobId);

  const emitter = (log) => {
    job.logs.push(log);
    broadcastLog(jobId, log);
  };

  try {
    const cloner = new WebsiteCloner({
      headless,
      outputDir: path.join(__dirname, '..', 'output'),
      emitter,
    });

    const result = await cloner.clone(url);

    job.status = 'completed';
    job.result = result;
    job.endTime = new Date().toISOString();

    broadcastLog(jobId, {
      type: 'complete',
      message: 'Clone completed successfully!',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    job.endTime = new Date().toISOString();

    broadcastLog(jobId, {
      type: 'error',
      message: `Clone failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
}

// Self-test endpoint
app.get('/api/test', async (req, res) => {
  console.log('Running self-test...');

  try {
    const cloner = new WebsiteCloner({
      headless: true,
      outputDir: path.join(__dirname, '..', 'output'),
      emitter: (log) => console.log(`[TEST] ${log.type}: ${log.message}`),
    });

    const result = await cloner.clone('https://example.com');

    // Verify output
    const fs = require('fs').promises;
    const outputPath = path.join(__dirname, '..', 'output', result.outputPath);
    const indexPath = path.join(outputPath, 'index.html');

    const indexExists = await fs.access(indexPath).then(() => true).catch(() => false);
    const indexContent = indexExists ? await fs.readFile(indexPath, 'utf8') : '';

    const testResult = {
      success: true,
      outputPath: result.outputPath,
      indexExists,
      indexSize: indexContent.length,
      assetsDownloaded: result.assetsDownloaded,
      openUrl: result.openUrl,
    };

    console.log('Self-test passed:', testResult);
    res.json(testResult);
  } catch (error) {
    console.error('Self-test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🍭  WEBSITE CLONER - Ultra-Futuristic Willy Wonka  🍭  ║
║                                                           ║
║   Server running at: http://localhost:${PORT}              ║
║                                                           ║
║   Open in browser to start cloning!                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server };
