const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const path = require('path');

app.use(cors());
app.use(express.json());

// Load Build Information
let buildInfo = { timestamp: 'Development' };
try {
  const fs = require('fs');
  buildInfo = JSON.parse(fs.readFileSync(path.join(__dirname, 'build-info.json'), 'utf8'));
  console.log(`🏗️  Backend Build Timestamp: ${buildInfo.timestamp}`);
} catch (e) {
  console.log('🏗️  No build-info.json found, running in production/dev without timestamp.');
}

// Global state for Simulation Portal
let agentSessionActive = false;
let portalState = [
  { id: "CLM-992-81A", patient: "Eleanor Vance", amount: "$12,450.00", status: "Denied" },
  { id: "CLM-814-22X", patient: "Marcus Thorne", amount: "$3,200.00", status: "Denied" },
  { id: "CLM-105-99B", patient: "Sarah Blake", amount: "$875.00", status: "Appealing" },
  { id: "CLM-202-55K", patient: "Julian Voss", amount: "$21,100.00", status: "Denied" },
  { id: "CLM-443-11L", patient: "Fiona Garrity", amount: "$1,450.00", status: "Denied" },
  { id: "CLM-778-90P", patient: "Desmond Miles", amount: "$45,600.00", status: "Denied" },
  { id: "CLM-991-04D", patient: "Lara Croft", amount: "$6,800.00", status: "Denied" },
  { id: "CLM-552-33W", patient: "Arthur Morgan", amount: "$15,200.00", status: "Denied" }
];

// Global Error Handler for total capture
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION:', reason);
});

// Root route for verification
app.get('/', (req, res) => {
  res.send('<h1>🚀 RevRecover Agentic Backend is LIVE</h1><p>The Brain is active and waiting for TinyFish orchestration.</p>');
});

// Health check route for deployment verification
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'active', 
    service: 'RevRecover Agent Backend', 
    buildTime: buildInfo.timestamp 
  });
});

// Serve Simulation Portal
app.get('/portal', (req, res) => {
  res.sendFile(path.join(__dirname, 'simulation-portal.html'));
});

// Portal Sync Endpoints
app.get('/api/portal-claims', (req, res) => {
  res.json({ claims: portalState, agentSessionActive });
});

app.post('/api/portal-submit', (req, res) => {
  const { claimId, notes } = req.body;
  console.log(`\n📬 [PORTAL SYNC] Received submission for ${claimId}`);
  console.log(`Notes: ${notes}`);
  
  const claim = portalState.find(c => c.id === claimId);
  if (claim) {
    claim.status = "Appealing";
  }
  res.json({ success: true });
});

// Mock Patient Database to provide context to the Agent
const patientDatabase = {
  "CLM-992-81A": { priorAuthCode: "AUTH-88X291-B" },
  "CLM-814-22X": { priorAuthCode: "AUTH-11C440-Z" },
  "CLM-202-55K": { priorAuthCode: "AUTH-VOSS-99" },
  "CLM-443-11L": { priorAuthCode: "AUTH-GARRITY-11" },
  "CLM-778-90P": { priorAuthCode: "AUTH-MILES-77" },
  "CLM-991-04D": { priorAuthCode: "AUTH-CROFT-00" },
  "CLM-552-33W": { priorAuthCode: "AUTH-MORGAN-55" }
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: Build the TinyFish goal string
// ─────────────────────────────────────────────────────────────────────────────
function buildGoal({ claimId, payer, denialReason, turbo, targetUrl, creds, patientContext }) {
  const isBlueButton = payer.toUpperCase().includes('MEDICARE') || payer.toUpperCase().includes('CMS');
  const isInternalPortal = targetUrl.includes('localhost') || targetUrl.includes('awsapprunner.com');

  const persona = `You are RevRecover, an expert autonomous claims adjudication agent.
Rules: only use element IDs when provided (#id), minimize clicks, do NOT open new tabs or search engines.`;

  const researchPhase = (isInternalPortal || isBlueButton || turbo) ? '' : `
STEP 1 - CLINICAL RESEARCH:
- Go to: https://clinicaltrials.gov/search?term=${encodeURIComponent(denialReason)}
- Extract: primary NCT# and one clinical outcome sentence
- Store in memory and continue`;

  let actionPhase;
  if (isBlueButton) {
    actionPhase = `
STEP 2 - CMS AUTHORIZATION:
- Go to: ${targetUrl}
- Login: username="${creds.user}", password="${creds.pass}"
- Find and click the "Connect", "Authorize", or "Allow" button
- DONE when URL changes or success message appears`;
  } else if (isInternalPortal) {
    actionPhase = `
STEP 2 - APPEAL SUBMISSION (use element IDs exactly as given):
- Go to: ${targetUrl}
- Type "${creds.user}" into #username
- Type "${creds.pass}" into #password
- Click #login-btn
- Click #drill-down-${claimId}
- Click #open-appeal-btn
- In #appeal-reason-select choose "Medical Necessity Documentation Attached"
- In #appeal-notes-area type: "Medical necessity confirmed for ${claimId}. Auth: ${patientContext.priorAuthCode || 'N/A'}. Requesting immediate reversal."
- Click #submit-appeal-btn
- DONE`;
  } else {
    actionPhase = `
STEP 2 - EXTERNAL PORTAL APPEAL:
- Go to: ${targetUrl}
- Login: username="${creds.user}", password="${creds.pass}"
- Find claim "${claimId}" (search by ID first, then by patient name if not found)
- Open the appeal or reconsideration workflow
- Enter medical necessity justification using clinical evidence from Step 1
- Submit the form
- DONE`;
  }

  return `${persona}
${researchPhase}
${actionPhase}`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: Build target URL
// ─────────────────────────────────────────────────────────────────────────────
function buildTargetUrl(publicPortalUrl) {
  let targetUrl = publicPortalUrl || process.env.MOCK_PORTAL_URL || 'http://localhost:5173';
  if (targetUrl.includes('awsapprunner.com') && !targetUrl.includes('/portal')) {
    targetUrl = targetUrl.endsWith('/') ? `${targetUrl}portal` : `${targetUrl}/portal`;
  }
  return targetUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/run-agent  →  SSE streaming endpoint (real-time events)
//   Front-end connects with EventSource('/api/run-agent-stream')
//   This endpoint just spawns the run and returns the runId immediately
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/run-agent', async (req, res) => {
  const { claimId, payer, denialReason, publicPortalUrl, turbo } = req.body;

  console.log(`\n🚀 [RUN-AGENT] claim=${claimId} payer=${payer} turbo=${turbo}`);
  console.log(`Target: ${publicPortalUrl || 'Local Mode'}`);

  const patientContext = patientDatabase[claimId] || {};
  const apiKey = process.env.TINYFISH_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    return res.status(500).json({ success: false, message: 'TinyFish API Key not configured.' });
  }

  const targetUrl = buildTargetUrl(publicPortalUrl);
  const getPortalCredentials = (payerName) => {
    let normalized = payerName.split(' ')[0].toUpperCase();
    if (normalized === 'MEDICARE' || normalized === 'CMS') normalized = 'BLUEBUTTON';
    return {
      user: process.env[`PAYER_${normalized}_USER`] || process.env.PORTAL_USER || 'admin',
      pass: process.env[`PAYER_${normalized}_PASS`] || process.env.PORTAL_PASS || 'password'
    };
  };
  const creds = getPortalCredentials(payer);
  const goal = buildGoal({ claimId, payer, denialReason, turbo, targetUrl, creds, patientContext });

  console.log(`\n🎯 Goal sent to TinyFish (${turbo ? 'TURBO' : 'FULL'} mode, target: ${targetUrl})`);
  console.log('--- GOAL ---\n', goal, '\n--- END GOAL ---');

  try {
    // ── Use SSE streaming endpoint for real-time event forwarding ──
    const tfResponse = await fetch('https://agent.tinyfish.ai/v1/automation/run-sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ url: targetUrl, goal, browser_profile: 'stealth' })
    });

    if (!tfResponse.ok) {
      const errText = await tfResponse.text();
      console.error('❌ TinyFish SSE start failed:', errText);
      return res.status(tfResponse.status).json({ success: false, message: `TinyFish error: ${errText}` });
    }

    // Set up SSE response headers so the browser can stream events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    agentSessionActive = true;

    // Pipe every SSE chunk from TinyFish → our frontend
    tfResponse.body.on('data', (chunk) => {
      const text = chunk.toString();
      // Forward raw SSE data lines as-is
      res.write(text);
      // Check for COMPLETE event to update portal state
      if (text.includes('"type":"COMPLETE"') || text.includes('"status":"COMPLETED"') || text.includes('"status":"SUCCESS"')) {
        agentSessionActive = false;
        // Mark claim as Appealing in portal state
        const claim = portalState.find(c => c.id === claimId);
        if (claim) claim.status = 'Appealing';
        console.log(`✅ TinyFish COMPLETE event received for claim ${claimId}`);
      }
    });

    tfResponse.body.on('end', () => {
      agentSessionActive = false;
      res.write('data: {"type":"STREAM_END"}\n\n');
      res.end();
      console.log(`🏁 TinyFish SSE stream ended for claim ${claimId}`);
    });

    tfResponse.body.on('error', (err) => {
      console.error('❌ Stream error:', err);
      res.write(`data: {"type":"ERROR","message":"${err.message}"}\n\n`);
      res.end();
    });

    req.on('close', () => {
      console.log('Frontend disconnected from SSE stream.');
      tfResponse.body.destroy();
    });

  } catch (err) {
    console.error('❌ CRITICAL ORCHESTRATION ERROR:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: `Backend Failure: ${err.message}` });
    }
  }
});
// Status polling endpoint to check TinyFish run state
app.get('/api/check-run/:id', async (req, res) => {
  const { id } = req.params;
  const apiKey = process.env.TINYFISH_API_KEY;

  try {
    // Force no-cache for polling
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Disable ETag to prevent 304 Not Modified loops
    res.removeHeader('ETag');

    const response = await fetch(`https://agent.tinyfish.ai/v1/runs/${id}`, {
      headers: { "X-API-Key": apiKey }
    });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: data.message });
    }

    // TinyFish uses "success" for completion, our frontend expects "completed"
    // Also handling potential uppercase versions for total robustness
    const rawStatus = (data.status || 'unknown').toLowerCase();
    const normalizedStatus = (rawStatus === 'success' || rawStatus === 'completed') ? 'completed' : rawStatus;

    if (normalizedStatus === 'completed' || normalizedStatus === 'failed') {
      agentSessionActive = false;
    }

    console.log(`[POLL] Run ${id}: TinyFish reported '${data.status}', normalized to '${normalizedStatus}'`);

    res.json({ 
      success: true, 
      status: normalizedStatus, 
      result: data.result 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Final Error Middleware
app.use((err, req, res, next) => {
  console.error("🔥 EXPRESS ERROR:", err);
  res.status(500).send("Internal Server Error - Check Logs");
});

app.listen(PORT, () => {
  console.log(`RevRecover Agent Backend listening on port ${PORT}`);
  console.log('Waiting for TinyFish API Integration...');
});
