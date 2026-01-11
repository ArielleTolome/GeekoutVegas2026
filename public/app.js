// Website Cloner - Frontend Application
// Ultra-Futuristic Willy Wonka Edition

(function() {
  'use strict';

  // DOM Elements
  const urlInput = document.getElementById('urlInput');
  const cloneBtn = document.getElementById('cloneBtn');
  const progressContainer = document.getElementById('progressContainer');
  const progressSteps = document.getElementById('progressSteps');
  const consoleContainer = document.getElementById('consoleContainer');
  const consoleEl = document.getElementById('console');
  const resultContainer = document.getElementById('resultContainer');
  const resultIcon = document.getElementById('resultIcon');
  const resultTitle = document.getElementById('resultTitle');
  const resultInfo = document.getElementById('resultInfo');
  const resultLink = document.getElementById('resultLink');
  const statAssets = document.getElementById('statAssets');
  const statTime = document.getElementById('statTime');
  const filterBtns = document.querySelectorAll('.filter-btn');

  // State
  let ws = null;
  let currentJobId = null;
  let startTime = null;
  let currentFilter = 'all';
  let logs = [];

  // Step mapping from log messages
  const stepKeywords = {
    'browser': ['launching browser', 'browser launched'],
    'navigate': ['navigating', 'page loaded'],
    'scroll': ['auto-scroll', 'scroll'],
    'extract': ['extracting', 'html extracted'],
    'download': ['downloading', 'downloaded', 'assets'],
    'rewrite': ['rewriting', 'rewrite'],
    'save': ['saving', 'save'],
    'done': ['completed', 'complete']
  };

  // Initialize particles
  function initParticles() {
    const container = document.getElementById('particles');
    const colors = ['#ff00ff', '#00ffff', '#bf00ff', '#00ff88', '#ff6600'];

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.animationDelay = Math.random() * 15 + 's';
      particle.style.animationDuration = (15 + Math.random() * 10) + 's';
      container.appendChild(particle);
    }
  }

  // Reset UI state
  function resetUI() {
    progressContainer.classList.remove('active');
    consoleContainer.classList.remove('active');
    resultContainer.classList.remove('active', 'error');
    consoleEl.innerHTML = '';
    logs = [];

    // Reset all steps
    document.querySelectorAll('.step').forEach(step => {
      step.classList.remove('active', 'completed', 'error');
      step.classList.add('pending');
      step.querySelector('.step-icon').innerHTML = '&#9899;';
    });
  }

  // Update step status
  function updateStep(stepName, status) {
    const step = document.querySelector(`.step[data-step="${stepName}"]`);
    if (!step) return;

    step.classList.remove('pending', 'active', 'completed', 'error');
    step.classList.add(status);

    const icon = step.querySelector('.step-icon');
    switch (status) {
      case 'active':
        icon.innerHTML = '&#10227;'; // Spinning circle
        break;
      case 'completed':
        icon.innerHTML = '&#10003;'; // Checkmark
        break;
      case 'error':
        icon.innerHTML = '&#10007;'; // X mark
        break;
      default:
        icon.innerHTML = '&#9899;'; // Dot
    }
  }

  // Detect step from log message
  function detectStep(message) {
    const lowerMsg = message.toLowerCase();

    for (const [step, keywords] of Object.entries(stepKeywords)) {
      for (const keyword of keywords) {
        if (lowerMsg.includes(keyword)) {
          return step;
        }
      }
    }
    return null;
  }

  // Add log entry to console
  function addLogEntry(log) {
    logs.push(log);

    // Check if we should display based on filter
    if (currentFilter !== 'all' && log.type !== currentFilter) {
      return;
    }

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.dataset.type = log.type;

    const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    entry.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-type ${log.type}">${log.type}</span>
      <span class="log-message">${escapeHtml(log.message)}</span>
    `;

    consoleEl.appendChild(entry);
    consoleEl.scrollTop = consoleEl.scrollHeight;

    // Update progress steps based on message
    const step = detectStep(log.message);
    if (step) {
      // Mark previous steps as completed
      const steps = ['browser', 'navigate', 'scroll', 'extract', 'download', 'rewrite', 'save', 'done'];
      const stepIndex = steps.indexOf(step);

      for (let i = 0; i < stepIndex; i++) {
        updateStep(steps[i], 'completed');
      }

      if (log.message.toLowerCase().includes('completed') || log.message.toLowerCase().includes('successfully')) {
        updateStep(step, 'completed');
      } else {
        updateStep(step, 'active');
      }
    }
  }

  // Apply filter to logs
  function applyFilter(filter) {
    currentFilter = filter;
    consoleEl.innerHTML = '';

    logs.forEach(log => {
      if (filter === 'all' || log.type === filter) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.dataset.type = log.type;

        const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        entry.innerHTML = `
          <span class="log-time">${time}</span>
          <span class="log-type ${log.type}">${log.type}</span>
          <span class="log-message">${escapeHtml(log.message)}</span>
        `;

        consoleEl.appendChild(entry);
      }
    });

    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Connect to WebSocket
  function connectWebSocket(jobId) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}?jobId=${jobId}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      addLogEntry({
        type: 'pipeline',
        message: 'Connected to server',
        timestamp: new Date().toISOString()
      });
    };

    ws.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);
        addLogEntry(log);

        // Handle completion
        if (log.type === 'complete') {
          handleComplete(log.result);
        } else if (log.type === 'error') {
          handleError(log.message);
        }
      } catch (e) {
        console.error('Failed to parse log:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };
  }

  // Handle successful completion
  function handleComplete(result) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    // Mark all steps as completed
    document.querySelectorAll('.step').forEach(step => {
      updateStep(step.dataset.step, 'completed');
    });

    // Show result
    resultContainer.classList.add('active');
    resultContainer.classList.remove('error');
    resultIcon.innerHTML = '&#127853;'; // Candy emoji
    resultTitle.textContent = 'Clone Complete!';
    resultInfo.textContent = `Successfully cloned to: ${result.outputPath}`;
    resultLink.href = result.openUrl;
    resultLink.style.display = 'inline-block';

    // Update stats
    statAssets.textContent = result.assetsDownloaded || 0;
    statTime.textContent = duration + 's';

    // Re-enable button
    cloneBtn.disabled = false;
    cloneBtn.textContent = 'Clone It';
  }

  // Handle error
  function handleError(message) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    // Show error result
    resultContainer.classList.add('active', 'error');
    resultIcon.innerHTML = '&#128165;'; // Explosion emoji
    resultTitle.textContent = 'Clone Failed';
    resultInfo.textContent = message;
    resultLink.style.display = 'none';

    // Update stats
    statTime.textContent = duration + 's';
    statAssets.textContent = '-';

    // Re-enable button
    cloneBtn.disabled = false;
    cloneBtn.textContent = 'Clone It';
  }

  // Start cloning
  async function startClone() {
    const url = urlInput.value.trim();

    if (!url) {
      alert('Please enter a URL to clone');
      urlInput.focus();
      return;
    }

    // Reset and show UI
    resetUI();
    progressContainer.classList.add('active');
    consoleContainer.classList.add('active');

    // Disable button
    cloneBtn.disabled = true;
    cloneBtn.textContent = 'Cloning...';
    startTime = Date.now();

    try {
      // Start clone job
      const response = await fetch('/api/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start clone');
      }

      currentJobId = data.jobId;

      // Connect to WebSocket for live updates
      connectWebSocket(currentJobId);

    } catch (error) {
      handleError(error.message);
    }
  }

  // Event listeners
  cloneBtn.addEventListener('click', startClone);

  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      startClone();
    }
  });

  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.filter);
    });
  });

  // Initialize
  initParticles();

  // Focus input on load
  urlInput.focus();

})();
