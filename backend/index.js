const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Root route for verification
app.get('/', (req, res) => {
  res.send('<h1>🚀 RevRecover Agentic Backend is LIVE</h1><p>The Brain is active and waiting for TinyFish orchestration.</p>');
});

// Health check route for deployment verification
app.get('/api/health', (col, res) => {
  res.json({ status: 'active', service: 'RevRecover Agent Backend' });
});

// Mock Patient Database to provide context to the Agent
const patientDatabase = {
  "CLM-992-81A": {
    priorAuthCode: "AUTH-88X291-B",
    clinicalNotes: "Patient requires extended physical therapy due to lack of mobility improvement. Conservative treatment failed.",
  },
  "CLM-814-22X": {
    priorAuthCode: "AUTH-11C440-Z",
    clinicalNotes: "MRI confirms tear. Surgery is medically necessary to prevent further joint damage.",
  }
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
    return res.status(500).json({ success: false, message: "TinyFish API Key not configured in .env" });
  }

  // Construct the "Real Work" Hybrid Goal for the TinyFish Agent
  // Order of priority: environment variable > request body > local fallback
  const targetUrl = process.env.MOCK_PORTAL_URL || publicPortalUrl || "http://localhost:5173";
  const goal = `
    PHASE 1: LIVE RESEARCH (REAL WORK)
    1. Navigate to: https://clinicaltrials.gov/
    2. Search for clinical evidence related to "${denialReason}".
    3. Extract 1-2 points of medical necessity or supporting research data.
    4. Keep this research in your session memory.

    PHASE 2: ACTION (PORTAL AUTOMATION)
    5. Navigate to: ${targetUrl}
    6. Securely authenticate using credentials (admin / password).
    7. Dismiss any HIPAA or legal affirmation modals if they appear.
    8. Find the claim with ID "${claimId}".
    9. Expand adjudication details and initiate the Appeal process.
    10. Complete the form using the Clinical Evidence gathered in Phase 1:
        - Prior Authorization: ${patientContext.priorAuthCode || 'None'}
        - Supporting Proof: Use the extracted research from ClinicalTrials.gov to write a compelling 2-sentence medical necessity statement.
    11. Submit the appeal and wait for confirmation.
  `;

  console.log("\n🤖 Sending Goal to TinyFish API...");
  
  try {
    const response = await fetch("https://api.tinyfish.ai/v1/automation/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        url: targetUrl,
        goal: goal,
        stream: false // We are doing a simple sync run for now
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

    console.log("✅ TinyFish Agent Completed successfully:", data.run_id);
    res.json({ 
      success: true, 
      message: "Agent completed workflow via TinyFish API.",
      trackingId: data.run_id || "TF-RUN-SUCCESS"
    });

  } catch (err) {
    console.error("❌ Infrastructure Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to connect to TinyFish API" });
  }
});

app.listen(PORT, () => {
  console.log(`RevRecover Agent Backend listening on port ${PORT}`);
  console.log('Waiting for TinyFish API Integration...');
});
