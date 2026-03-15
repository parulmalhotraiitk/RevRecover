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

app.post('/api/run-agent', async (req, res) => {
  const { claimId, payer, denialReason, publicPortalUrl } = req.body;

  console.log(`\n🚀 Received request to run agent for claim: ${claimId}`);
  console.log(`Payer: ${payer} | Denial: ${denialReason}`);
  console.log(`Target URL: ${publicPortalUrl || 'Local Mode'}`);

  const patientContext = patientDatabase[claimId] || {};
  const apiKey = process.env.TINYFISH_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    console.error("❌ TinyFish API Key missing or invalid.");
    return res.status(500).json({ success: false, message: "TinyFish API Key not configured in App Runner environment variables." });
  }

  // Construct the "Real Work" Hybrid Goal for the TinyFish Agent
  // Dashboard Input (publicPortalUrl) takes priority over Environment Variable (MOCK_PORTAL_URL)
  let targetUrl = publicPortalUrl || process.env.MOCK_PORTAL_URL || "http://localhost:5173";
  
  // Smart Append: Ensure simulation portal path is present for AWS Simulation Mode
  if (targetUrl.includes('awsapprunner.com') && !targetUrl.includes('/portal')) {
      targetUrl = targetUrl.endsWith('/') ? `${targetUrl}portal` : `${targetUrl}/portal`;
      console.log(`✨ Smart URL Correction: Appended /portal to ${targetUrl}`);
  }
  // Multi-Payer Credential Vault Logic
  // Looks for env vars matching PAYER_[NAME]_USER and PAYER_[NAME]_PASS
  const getPortalCredentials = (payerName) => {
    let normalized = payerName.split(' ')[0].toUpperCase(); // "Aetna Medicare" -> "AETNA"
    
    // Explicit Aliases for the God-Tier Demo
    if (normalized === "MEDICARE" || normalized === "CMS") normalized = "BLUEBUTTON";

    return {
      user: process.env[`PAYER_${normalized}_USER`] || process.env.PORTAL_USER || 'admin',
      pass: process.env[`PAYER_${normalized}_PASS`] || process.env.PORTAL_PASS || 'password'
    };
  };

  const creds = getPortalCredentials(payer);

  // Refine the goal for the Blue Button Sandbox to prevent generic redirects
  const isBlueButton = payer.toUpperCase().includes("MEDICARE") || payer.toUpperCase().includes("CMS");
  
  // Detect if target is our internal simulation portal
  const isInternalPortal = targetUrl.includes('localhost') || targetUrl.includes('awsapprunner.com');

  const agentPersona = `
    ## IDENTIFICATION: RevRecover Autonomous Claims Specialist (v2.0)
    ## MISSION: Expert-level navigation of healthcare portals to adjudicate denied claims through clinical evidence and professional appeal formalization.
    
    ## OPERATIONAL RULES:
    1. STRICT DETERMINISM: Use specific IDs (#id) whenever provided.
    2. HIPAA COMPLIANCE: Do not store PII in long-term memory.
    3. EFFICIENCY: Execute the minimum number of clicks to reach the "Mission Complete" state.
    4. NO EXTERNAL SEARCH: Unless explicitly specified in Phase 1.
  `;

  // Pivot logic: Adapt instructions based on portal "Tier"
  const phase2Goal = isBlueButton 
      ? `
    ## PHASE 2: SECURE CMS AUTHORIZATION
    ### 1. Website Navigation
    * Navigate to: ${targetUrl}
    * Authenticate Identity: ${creds.user} | Passkey: ${creds.pass}
    ### 2. Authorization Execution
    * STAY on ${targetUrl}. Disregard medicare.gov redirects.
    * Target text: "Connect", "Authorize", or "Allow".
    * Finalize: Execute "MISSION COMPLETE" on successful redirect.
    ` 
      : isInternalPortal 
        ? `
    ## PHASE 2: INTERNAL SIMULATION RESOLUTION (TURBO)
    ### 1. Deterministic Authentication
    * Type "${creds.user}" in #username
    * Type "${creds.pass}" in #password
    * Click #login-btn
    ### 2. Claim Adjudication (Low Latency)
    * Click element matching: #drill-down-${claimId}
    * Click: #open-appeal-btn
    * Selection: Choose "Medical Necessity" in #appeal-reason-select
    * Narrative: Input "Deterministic clinical reversal requested for ${claimId}. Ref: ${patientContext.priorAuthCode || 'AUTH-SIM-99'}." in #appeal-notes-area
    * Execute: Click #submit-appeal-btn
    * Terminate: MISSION COMPLETE
    `
        : `
    ## PHASE 2: EXTERNAL PORTAL ADJUDICATION
    ### 1. Navigation & Discovery
    * Navigate to: ${targetUrl}
    * Authenticate Identity: ${creds.user} | Passkey: ${creds.pass}
    * SEARCH PRIORITIZATION: 
      | Priority | Search Term |
      | -- | -- |
      | 1. Primary | Claim Reference ID: "${claimId}" |
      | 2. Secondary | Patient Unique Identifier |
      | 3. Tertiary | Status: "Denied" + Service Date |
    ### 2. Appeal Formalization
    * Trigger entry point: "Appeal", "Reconsideration", or "Review".
    * Draft medical necessity plea using evidence extracted in Phase 1.
    * Finalize: Submit and capture confirmation code.
    ### 3. Error Handling
    * If 404/Login fail: Retry authentication once.
    * If claim not found: Perform a broader date search.
    * MISSION COMPLETE.
    `;

  // Construct the "Real Work" Hybrid Goal for the TinyFish Agent
  const researchPhase = (isInternalPortal || isBlueButton || turbo) ? "" : `
    ## PHASE 1: CLINICAL RESEARCH (EVIDENCE EXTRACTION)
    1. Navigate to: https://clinicaltrials.gov/search?term=${encodeURIComponent(denialReason)}
    2. STANDARDIZATION TABLE:
       | Requirement | Extraction Logic |
       | -- | -- |
       | Study ID | NCT# (Primary Study) |
       | Evidence | Most significant clinical outcome sentence |
    3. Store findings in local session context.
  `;

  const goal = `
    ${agentPersona}
    
    ## COMMAND SET: EXECUTE DETERMINISTIC ADJUDICATION
    
    ${researchPhase}
    
    ${phase2Goal}
  `;

  console.log(`\n🤖 Sending Goal to TinyFish API (Target: ${targetUrl})...`);
  
  try {
    const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-async", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify({
        url: targetUrl,
        goal: goal
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ TinyFish API Error:", data);
      return res.status(response.status).json({ 
        success: false, 
        message: data.message || "TinyFish Agent encountered an error." 
      });
    }

    // Set portal session to active
    agentSessionActive = true;
    setTimeout(() => { agentSessionActive = false; }, 300000); // Reset after 5 mins fallback

    console.log("✅ TinyFish Agent started successfully:", data.run_id);
    res.json({ 
      success: true, 
      message: "Agent workflow initiated in cloud.",
      runId: data.run_id
    });

  } catch (err) {
    console.error("❌ CRITICAL ORCHESTRATION ERROR:", err);
    res.status(500).json({ 
      success: false, 
      message: `Backend Failure: ${err.message}`,
      stack: err.stack 
    });
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
