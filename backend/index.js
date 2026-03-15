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

  // KEY INSIGHT: TinyFish already navigates to targetUrl before running this goal.
  // Do NOT instruct the agent to "go to URL" - it starts there. Go straight to actions.

  if (isBlueButton) {
    return `You are already on the CMS Blue Button authorization page.
Task: Authorize the data connection for the RevRecover system.

Step 1 - Check current state of the page. Look for a login form.
Step 2 - If a login form is present:
  - Type "${creds.user}" into the username/email field
  - Type "${creds.pass}" into the password field
  - Click the login/submit button
  - Wait for the page to update after login
Step 3 - Find a button or link labeled "Connect", "Authorize", or "Allow". Click it.
Step 4 - Wait for a success indication (URL change or on-screen success message).
Return: { "status": "authorized", "message": "<any text confirming success>" }`;
  }

  if (isInternalPortal) {
    return `You are already on the AetnaCare Provider Portal login page at ${targetUrl}.
Task: Log in, dismiss the HIPAA modal, find claim ${claimId}, and submit a medical necessity appeal.
IMPORTANT: Use ONLY the exact element IDs listed. Do not improvise or look for elements by text.

STEP 1 — Login:
- Find the login form. It is already visible on the current page.
- Type "${creds.user}" into the input with id="username"
- Type "${creds.pass}" into the input with id="password"
- Click the button with id="login-btn"
- Pause and wait for the page to fully transition (a new screen or overlay will appear)

STEP 2 — HIPAA Acknowledgment Modal:
- After login, a modal dialog WILL appear. It is a legal/compliance popup.
- DO NOT try to skip it or click anywhere else first.
- Click the button with id="agree-hipaa" to accept and dismiss it.
- Wait until the modal is fully gone and the dashboard is visible behind it.

STEP 3 — Locate the Claim:
- The claims table is now visible on the dashboard.
- Find the row for claim ${claimId}.
- Click the button with id="drill-down-${claimId}"
- Wait for the claim detail page to finish loading.

STEP 4 — Open the Appeal Form:
- Click the button with id="open-appeal-btn"
- Wait for the appeal form panel or modal to appear.

STEP 5 — Complete the Appeal Form:
- In the dropdown/select with id="appeal-reason-select", choose the option "Medical Necessity Documentation Attached"
- In the textarea with id="appeal-notes-area", type exactly: "Clinical medical necessity confirmed for claim ${claimId}. Authorization reference: ${patientContext.priorAuthCode || 'AUTH-PENDING'}. Services rendered are consistent with patient diagnosis and established clinical criteria. Requesting immediate reversal of denial."
- Click the button with id="submit-appeal-btn"
- Wait for the success confirmation screen to appear.

STEP 6 — Return Result:
Return JSON: { "status": "appeal_submitted", "claimId": "${claimId}", "message": "<any confirmation text visible on screen after submission>" }`;
  }

  // External real payer portal
  const researchStep = turbo ? '' : `

STEP 1 — Clinical Evidence Research (do this first, before logging in):
- Navigate to: https://clinicaltrials.gov/search?term=${encodeURIComponent(denialReason)}
- Locate the first relevant clinical trial in the search results.
- Extract and memorize: (a) the NCT# identifier, (b) one key clinical outcome sentence.
- After extracting, close the research tab or navigate back to the portal.`;

  const s = turbo ? 1 : 2;

  return `You are already on the ${payer} provider portal at ${targetUrl}.
Task: Log in, find claim ${claimId}, and file a medical necessity appeal.${researchStep}

STEP ${s} — Login:
- The login page is currently visible.
- Type "${creds.user}" into the username, NPI, or Provider ID field.
- Type "${creds.pass}" into the password field.
- Click the login or sign-in button.
- Handle any popups (HIPAA acknowledgment, MFA prompts, terms of use) by accepting/agreeing.
- Wait until the main portal dashboard or claims list loads.

STEP ${s + 1} — Find Claim ${claimId}:
- Look for a search bar, claims inquiry section, or remittance lookup.
- Search for claim ID "${claimId}" directly.
- If not found, filter or browse claims with status "Denied" and locate "${claimId}".
- Click into the claim to open its detail view.

STEP ${s + 2} — File Medical Necessity Appeal:
- Find the "Appeal", "Request Reconsideration", "Dispute", or "Reopen" option for this claim.
- Set the appeal reason/category to "Medical Necessity".
- In the notes or justification field, type:
  "${turbo
    ? `Medical necessity is established for claim ${claimId}. Prior authorization ref: ${patientContext.priorAuthCode || 'N/A'}. Clinical criteria are fully met. Requesting immediate reversal of denial.`
    : `Medical necessity is established for claim ${claimId}. Clinical evidence from trial [NCT from Step 1]: [evidence sentence from Step 1]. Prior authorization ref: ${patientContext.priorAuthCode || 'N/A'}. Requesting immediate reversal of denial.`}"
- Submit the form.

STEP ${s + 3} — Confirm Submission:
- Wait for a confirmation number, reference ID, or on-screen success message.
Return JSON: { "status": "appeal_submitted", "claimId": "${claimId}", "payer": "${payer}", "confirmation": "<confirmation number or message text>" }`;
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
