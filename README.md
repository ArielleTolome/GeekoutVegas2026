# GEEKOUT VEGAS 2026

```
 ██████╗ ███████╗███████╗██╗  ██╗ ██████╗ ██╗   ██╗████████╗
██╔════╝ ██╔════╝██╔════╝██║ ██╔╝██╔═══██╗██║   ██║╚══██╔══╝
██║  ███╗█████╗  █████╗  █████╔╝ ██║   ██║██║   ██║   ██║
██║   ██║██╔══╝  ██╔══╝  ██╔═██╗ ██║   ██║██║   ██║   ██║
╚██████╔╝███████╗███████╗██║  ██╗╚██████╔╝╚██████╔╝   ██║
 ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝    ╚═╝

██╗   ██╗███████╗ ██████╗  █████╗ ███████╗    ██████╗  ██████╗ ██████╗  ██████╗
██║   ██║██╔════╝██╔════╝ ██╔══██╗██╔════╝    ╚════██╗██╔═████╗╚════██╗██╔════╝
██║   ██║█████╗  ██║  ███╗███████║███████╗     █████╔╝██║██╔██║ █████╔╝███████╗
╚██╗ ██╔╝██╔══╝  ██║   ██║██╔══██║╚════██║    ██╔═══╝ ████╔╝██║██╔═══╝ ██╔═══██╗
 ╚████╔╝ ███████╗╚██████╔╝██║  ██║███████║    ███████╗╚██████╔╝███████╗╚██████╔╝
  ╚═══╝  ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝    ╚══════╝ ╚═════╝ ╚══════╝ ╚═════╝
```

## Website Cloner - Wonka Labs Edition

> **Clone any website with pixel-perfect accuracy using real browser rendering**

---

## Quick Start

### Option 1: GitHub Codespaces (Recommended)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/phc-global/GeekoutVegas2026)

### Option 2: Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/phc-global/GeekoutVegas2026.git
cd GeekoutVegas2026

# 2. Install dependencies (also installs Chromium)
npm install

# 3. Start the server
npm run dev
```

---

## Usage

1. Open your browser to `http://localhost:3000`
2. Enter a URL to clone (e.g., `https://example.com`)
3. Click **Clone It**
4. Watch the live console as the cloner:
   - Launches a real Chromium browser
   - Navigates to the page
   - Auto-scrolls to trigger lazy loading
   - Downloads all assets (images, CSS, JS, fonts)
   - Rewrites URLs to use local assets
5. Click **Open Clone** to view your cloned page

---

## Features

- **Real Browser Rendering** - Uses Playwright with Chromium to render JavaScript-heavy pages
- **Auto-Scroll** - Automatically scrolls to load lazy content
- **Asset Download** - Downloads images, CSS, JS, fonts, and more
- **URL Rewriting** - All asset URLs are rewritten to use local paths
- **Live Console** - Stream browser console and network logs in real-time
- **Progress Tracking** - Visual progress steps for the cloning pipeline
- **Futuristic UI** - Ultra-futuristic Willy Wonka themed interface

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clone` | POST | Start a clone job. Body: `{ url: string }` |
| `/api/jobs/:jobId` | GET | Get job status and result |
| `/api/test` | GET | Run self-test on example.com |
| `/api/health` | GET | Health check |
| `/clone/:folder/` | GET | Serve cloned websites |

WebSocket: Connect to `ws://localhost:3000?jobId=<jobId>` for live logs.

---

## Project Structure

```
.
├── server/
│   ├── index.js      # Express server + WebSocket
│   ├── cloner.js     # Core cloning pipeline
│   └── utils.js      # Helper functions
├── public/
│   ├── index.html    # Futuristic UI
│   └── app.js        # Frontend logic
├── output/           # Cloned websites go here
└── package.json
```

---

## Troubleshooting

### Chromium not installed
```bash
npx playwright install chromium
```

### Permission denied on Mac/Linux
```bash
chmod +x node_modules/.bin/*
```

### EACCES error on port 3000
```bash
PORT=8080 npm run dev
```

### Clone fails on complex sites
- Some sites have anti-bot protection
- JavaScript-only content may not fully render
- Try increasing wait times in `cloner.js`

---

## Pre-Installed Dependencies

| Package | Purpose |
|---------|---------|
| **Node.js 20+** | Runtime |
| **Playwright** | Browser automation & rendering |
| **Express** | Web server |
| **WebSocket (ws)** | Real-time log streaming |
| **node-html-parser** | HTML parsing |
| **uuid** | Job ID generation |

---

## Build Your Own

Want to build this from scratch? Start Claude Code and paste this prompt:

<details>
<summary>View the full prompt</summary>

```
YOU ARE CLAUDE CODE.
Build a working MVP "Website Cloner" that produces an EXACT static clone of a landing page (including VERY long pages), hosted locally by the same app (backend serves frontend). The app must be simple enough to build in a 45-minute workshop, but cloning quality must be high.

NON-NEGOTIABLE REQUIREMENTS
1) Backend serves frontend:
   - Single Node.js app (Express) that serves a UI and also runs the cloning pipeline.
2) Must use a real browser:
   - Use Playwright with Chromium. (No "requests + cheerio only" clone; it must render and capture a real DOM.)
3) Must have visible Chrome console logs:
   - Capture page console logs from Playwright and stream them to the web UI in real-time (WebSocket or SSE).
   - Also capture network request/response logs (URL, status, resource type).
4) Must clone ENTIRE page even if super long:
   - Scroll to bottom to trigger lazy-loading.
   - Wait for network idle.
   - Capture full HTML after render.
   - Download and rewrite assets locally (images, CSS, JS, fonts when possible).
5) Must produce a "viewable clone":
   - Output to ./output/<safe-hostname>_<timestamp>/
   - Provide a link in the UI to open the cloned page in a new tab.
6) MVP scope:
   - Only supports public pages without login.
   - Focus on "best possible static clone" (not a perfect JS app rehost).
7) Style requirement:
   - The APP UI itself should be "ultra-futuristic Willy Wonka" (neon candy-factory vibe), but the CLONED PAGE must remain identical. Do NOT restyle the clone. Only style the app UI.

TECH STACK
- Node 20+
- Express
- Playwright (Chromium)
- Minimal frontend: vanilla HTML + Tailwind via CDN OR a small bundled CSS. Keep it fast and workshop-friendly.
- Use WebSocket (ws) OR Server-Sent Events for streaming logs to UI.
```

</details>

---

## Push to Your Own GitHub

```bash
# 1. Create a new repo on GitHub (github.com/new)
# 2. Change the remote
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 3. Push your code
git add -A
git commit -m "My website cloner from Geekout Vegas 2026"
git push -u origin main
```

---

## Need Help?

Raise your hand or ask in the workshop chat!

---

**Workshop by [Samar Hussain](https://github.com/samarhussain90)**
