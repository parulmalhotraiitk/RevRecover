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

// Redirect logout to portal to prevent 404s if agent wanders
app.get('/portal/logout', (req, res) => {
  res.redirect('/portal');
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

  // INTERNAL SIMULATION PORTAL (simulation-portal.html)
  // NO login on this portal. Claims table is immediately visible.
  // Correct button IDs: btn-resolve-{claimId}, appeal-text, submit-btn
  if (isInternalPortal) {
    const appealText = 'Medical necessity confirmed for claim ' + claimId + '. Auth ref: ' + (patientContext.priorAuthCode || 'AUTH-PENDING') + '. Clinical criteria fully met. Requesting immediate reversal of denial.';
    return [
      'The page is already loaded. This is the AetnaCare Provider Portal claims table.',
      'There is NO login on this portal. You are already authenticated as Dr. Sarah Miller.',
      'DO NOT try to log in, log out, or navigate away from this page.',
      '',
      'YOUR TASK — complete these steps in order:',
      '',
      'STEP 1 — Click the Resolve Now button:',
      '- Locate the button with id="btn-resolve-' + claimId + '" in the claims table',
      '- Click it immediately. A modal dialog will appear.',
      '',
      'STEP 2 — Fill in the appeal text:',
      '- The modal is open with a textarea (id="appeal-text")',
      '- Click inside the textarea to focus it',
      '- Type exactly: ' + appealText,
      '',
      'STEP 3 — Submit:',
      '- Click the button with id="submit-btn" (labeled Submit Clinical Review)',
      '- Wait for the button to show SENT SUCCESSFULLY',
      '',
      'STEP 4 — Return:',
      'Return JSON: { "status": "appeal_submitted", "claimId": "' + claimId + '" }'
    ].join('\n');
  }

  // CMS / MEDICARE
  if (isBlueButton) {
    return [
      'The page is already loaded. This is a CMS Medicare authorization page.',
      'Task: Authorize the data connection.',
      '',
      'STEP 1 — If a login form is visible:',
      '- Type "' + creds.user + '" into the username field',
      '- Type "' + creds.pass + '" into the password field',
      '- Click the login button and wait for redirect.',
      '',
      'STEP 2 — Click the authorization button:',
      '- Find "Connect", "Authorize", or "Allow" and click it.',
      '',
      'Return JSON: { "status": "authorized", "message": "<confirmation text>" }'
    ].join('\n');
  }

  // EXTERNAL REAL PAYER PORTAL
  const researchStep = turbo ? '' : [
    '',
    'STEP 1 — Research (do before logging in):',
    '- Go to: https://clinicaltrials.gov/search?term=' + encodeURIComponent(denialReason),
    '- Extract the NCT# and one clinical outcome sentence from the first result.',
    '- Navigate back to the portal tab.',
    ''
  ].join('\n');

  const s = turbo ? 1 : 2;
  const justification = turbo
    ? 'Medical necessity established for claim ' + claimId + '. Auth ref: ' + (patientContext.priorAuthCode || 'N/A') + '. Criteria met. Requesting reversal.'
    : 'Medical necessity established for claim ' + claimId + '. Evidence [NCT from Step 1]: [outcome sentence]. Auth ref: ' + (patientContext.priorAuthCode || 'N/A') + '. Requesting reversal.';

  return [
    'The page is already loaded. This is the ' + payer + ' provider portal.',
    'Task: Log in, find claim ' + claimId + ', and submit a medical necessity appeal.',
    researchStep,
    'STEP ' + s + ' — Login:',
    '- Enter "' + creds.user + '" in the username / Provider ID field',
    '- Enter "' + creds.pass + '" in the password field',
    '- Click the login button',
    '- Accept any HIPAA, MFA, or terms popups by agreeing/accepting',
    '- Wait for the dashboard to fully load',
    '',
    'STEP ' + (s+1) + ' — Find Claim ' + claimId + ':',
    '- Search for "' + claimId + '" using claims search or lookup',
    '- If not found by ID, filter by Denied status and find "' + claimId + '"',
    '- Open the claim detail view',
    '',
    'STEP ' + (s+2) + ' — File the Appeal:',
    '- Find the Appeal / Reconsideration / Dispute option',
    '- Set reason to Medical Necessity',
    '- In the notes field type: ' + justification,
    '- Submit the form',
    '',
    'STEP ' + (s+3) + ' — Confirm:',
    '- Wait for a confirmation number or success message',
    'Return JSON: { "status": "appeal_submitted", "claimId": "' + claimId + '", "payer": "' + payer + '", "confirmation": "<text>" }'
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: Build target URL
// Auto-detects the App Runner public URL from the incoming request
// so TinyFish (cloud-hosted) can reach the portal instead of localhost
// ─────────────────────────────────────────────────────────────────────────────
function buildTargetUrl(publicPortalUrl, req) {
  if (publicPortalUrl && publicPortalUrl.trim().length > 0) {
    // User explicitly provided a URL (e.g. ngrok tunnel)
    let url = publicPortalUrl.trim();
    if (url.includes('awsapprunner.com') && !url.includes('/portal')) {
      url = url.endsWith('/') ? `${url}portal` : `${url}/portal`;
    }
    return url;
  }

  // Auto-detect the App Runner URL from request headers
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || 'https';

  if (host && host.includes('awsapprunner.com')) {
    const base = `${proto}://${host}`;
    const portalUrl = `${base}/portal`;
    console.log(`🔍 Auto-detected App Runner portal URL: ${portalUrl}`);
    return portalUrl;
  }

  // Fallback to env var or localhost (dev only)
  let fallback = process.env.MOCK_PORTAL_URL || 'http://localhost:5173';
  if (fallback.includes('awsapprunner.com') && !fallback.includes('/portal')) {
    fallback = fallback.endsWith('/') ? `${fallback}portal` : `${fallback}/portal`;
  }
  console.warn(`⚠️  Using fallback portal URL: ${fallback}. Set MOCK_PORTAL_URL env var on App Runner if this is wrong.`);
  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/run-agent  →  Starts agent, returns runId for polling
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/run-agent', async (req, res) => {
  const { claimId, payer, denialReason, publicPortalUrl, turbo } = req.body;

  console.log(`\n🚀 [RUN-AGENT] claim=${claimId} payer=${payer} turbo=${turbo}`);

  const patientContext = patientDatabase[claimId] || {};
  const apiKey = process.env.TINYFISH_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    return res.status(500).json({ success: false, message: 'TinyFish API Key not configured.' });
  }

  const targetUrl = buildTargetUrl(publicPortalUrl, req);
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

  console.log(`🎯 Target: ${targetUrl} | Mode: ${turbo ? 'TURBO' : 'FULL'}`);
  console.log('--- GOAL ---\n', goal, '\n--- END GOAL ---');

  try {
    const tfResponse = await fetch('https://agent.tinyfish.ai/v1/automation/run-async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ url: targetUrl, goal, browser_profile: 'stealth' })
    });

    const data = await tfResponse.json();

    if (!tfResponse.ok) {
      console.error('❌ TinyFish error:', data);
      return res.status(tfResponse.status).json({
        success: false,
        message: data.message || data.detail || 'TinyFish Agent error.'
      });
    }

    agentSessionActive = true;
    // Safety: reset after 10 minutes max
    setTimeout(() => { agentSessionActive = false; }, 600000);

    const runId = data.run_id || data.id;
    console.log(`✅ Agent started. runId=${runId}`);

    res.json({ success: true, runId, message: 'Agent started successfully.' });

  } catch (err) {
    console.error('❌ ORCHESTRATION ERROR:', err);
    res.status(500).json({ success: false, message: `Backend error: ${err.message}` });
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
