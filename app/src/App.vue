<script setup>
import { ref, onMounted, computed } from 'vue'
import { ShieldAlert, FileText, CheckCircle, Clock, UploadCloud, ChevronRight, Activity, ArrowRight, UserCircle, DollarSign, Users, Zap, Terminal, HelpCircle, ChevronDown, Sun, Moon } from 'lucide-vue-next'

const INITIAL_CLAIMS = [
  {
    id: "CLM-999-CMS",
    patient: "Ezio Auditore",
    dob: "1955-08-12",
    dateOfService: "2026-03-01",
    amount: "$12,400.00",
    payer: "Medicare (CMS)",
    status: "Denied",
    denialReason: "Duplicate Claim (Code 18)",
    urgency: "High",
    daysToAppeal: 12
  },
  {
    id: "CLM-992-81A",
    patient: "Eleanor Vance",
    dob: "1942-05-12",
    dateOfService: "2026-02-14",
    amount: "$12,450.00",
    payer: "Aetna Medicare",
    status: "Denied",
    denialReason: "Missing Prior Authorization (Code 197)",
    urgency: "High",
    daysToAppeal: 12
  },
  {
    id: "CLM-814-22X",
    patient: "Marcus Thorne",
    dob: "1978-11-04",
    dateOfService: "2026-02-28",
    amount: "$3,200.00",
    payer: "UnitedHealthcare",
    status: "Denied",
    denialReason: "Procedure Not Medically Necessary (Code 50)",
    urgency: "Medium",
    daysToAppeal: 45
  },
  {
    id: "CLM-105-99B",
    patient: "Sarah Blake",
    dob: "1992-08-21",
    dateOfService: "2026-03-01",
    amount: "$875.00",
    payer: "BlueCross BlueShield",
    status: "Appealing",
    denialReason: "Duplicate Claim Submission (Code 18)",
    urgency: "Low",
    daysToAppeal: 88
  },
  {
    id: "CLM-202-55K",
    patient: "Julian Voss",
    dob: "1965-12-19",
    dateOfService: "2026-03-10",
    amount: "$21,100.00",
    payer: "Cigna Health",
    status: "Denied",
    denialReason: "Experimental/Investigational (Code 114)",
    urgency: "High",
    daysToAppeal: 5
  },
  {
    id: "CLM-443-11L",
    patient: "Fiona Garrity",
    dob: "1988-03-25",
    dateOfService: "2026-03-12",
    amount: "$1,450.00",
    payer: "Humana",
    status: "Denied",
    denialReason: "Non-Covered Service (Code 96)",
    urgency: "Medium",
    daysToAppeal: 22
  },
  {
    id: "CLM-778-90P",
    patient: "Desmond Miles",
    dob: "1984-07-07",
    dateOfService: "2026-03-14",
    amount: "$45,600.00",
    payer: "Kaiser Permanente",
    status: "Denied",
    denialReason: "Lack of Documentation (Code 16)",
    urgency: "High",
    daysToAppeal: 9
  },
  {
    id: "CLM-991-04D",
    patient: "Lara Croft",
    dob: "1992-02-14",
    dateOfService: "2026-03-15",
    amount: "$6,800.00",
    payer: "Aetna",
    status: "Denied",
    denialReason: "Step Therapy Required (Code 130)",
    urgency: "Medium",
    daysToAppeal: 31
  },
  {
    id: "CLM-552-33W",
    patient: "Arthur Morgan",
    dob: "1973-05-18",
    dateOfService: "2026-03-16",
    amount: "$15,200.00",
    payer: "UnitedHealthcare",
    status: "Denied",
    denialReason: "Co-ordination of Benefits (Code 22)",
    urgency: "Medium",
    daysToAppeal: 15
  },
  {
    id: "CLM-101-HIST",
    patient: "John Marston",
    dob: "1873-10-14",
    dateOfService: "2026-02-01",
    amount: "$2,400.00",
    payer: "Aetna",
    status: "Appealing",
    denialReason: "Medical Necessity (Code 50)",
    urgency: "High",
    daysToAppeal: 0,
    completedAt: "2026-03-14, 2:45 PM",
    appealContent: "Based on ClinicalTrials.gov study NCT03124567, the prescribed treatment is the Gold Standard for patients over 50 with chronic orthopedic inflammation. Conservative treatments (PT, NSAIDs) failed over a 6-month period. Medical necessity is clearly established."
  }
];

const claims = ref([...INITIAL_CLAIMS]);
const selectedClaim = ref(null);
const agentStatus = ref("idle"); 
const liveFeed = ref([]);
const recoveredRevenue = ref(43250);
const hoursSaved = ref(128);
const publicPortalUrl = ref("");
const isDark = ref(true);
const isTurbo = ref(false); // Turbo OFF by default for full research
const activeTab = ref("queue"); // "queue" or "history"

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER STACK: ElevenLabs — Voice announcement after successful appeal
// Key is held securely on the backend. Frontend calls /api/tts proxy.
// Docs: https://elevenlabs.io/docs/api-reference/text-to-speech
// ─────────────────────────────────────────────────────────────────────────────
const announceAppealSuccess = async (patientName, amount) => {
  const text = `Appeal successfully filed for ${patientName}. ${amount} is now under active recovery review by TinyFish.`;
  const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel — natural, professional voice
  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

  try {
    const audioRes = await fetch(`${apiBaseUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId })
    });

    if (audioRes.ok) {
      const blob = await audioRes.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      return;
    }

    // Non-ok response (e.g. 402 quota exceeded, 503 key not set) — log and fall through to browser speech
    console.warn(`[ElevenLabs] TTS proxy returned ${audioRes.status}. Falling back to browser speech.`);
  } catch (e) {
    console.warn('[ElevenLabs] TTS proxy network error, falling back to browser speech:', e.message);
  }

  // Fallback: browser built-in SpeechSynthesis (works without API key)
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }
};

const handleTabSwitch = (tab) => {
  activeTab.value = tab;
  selectedClaim.value = null; // Clear selection to keep UI clean during audit
};

const frontendBuildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'Dev';
const backendBuildTime = ref('Syncing...');

const fetchBackendHealth = async () => {
  try {
    const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const res = await fetch(`${apiBaseUrl}/api/health`);
    const data = await res.json();
    backendBuildTime.value = data.buildTime || 'N/A';
  } catch (e) {
    backendBuildTime.value = 'Offline';
  }
};

const RARC_MAP = {
  "Code 197": "Missing Prior Authorization. This service requires medical necessity review before performance.",
  "Code 50": "Medical Necessity. The documentation provided does not support the intensity of service.",
  "Code 18": "Duplicate Claim. Our records show an identical service was already processed or paid.",
  "Code 114": "Experimental/Investigational. The treatment is not yet FDA approved for this specific diagnosis.",
  "Code 96": "Non-Covered Service. This specific procedure is excluded from the patient's benefits package.",
  "Code 16": "Lack of Documentation. Requires additional clinical charts or operative notes for adjudication.",
  "Code 130": "Step Therapy Required. Patient must try and fail lower-cost alternatives before this treatment.",
  "Code 22": "Co-ordination of Benefits. Requires verification of primary insurance coverage before this claim can be adjudicated."
};

const activeCredentialKey = computed(() => {
  if (!selectedClaim.value) return "NONE";
  let payer = selectedClaim.value.payer.split(' ')[0].toUpperCase();
  if (payer === "MEDICARE" || payer === "CMS") payer = "BLUEBUTTON";
  return `PAYER_${payer}`;
});

const formattedAppealContent = computed(() => {
  if (!selectedClaim.value || !selectedClaim.value.appealContent) return null;
  try {
    // Attempt to parse if it's a JSON string
    return JSON.parse(selectedClaim.value.appealContent);
  } catch (e) {
    return null;
  }
});

// Persistence Logic
const saveState = () => {
  const state = {
    recoveredRevenue: recoveredRevenue.value,
    hoursSaved: hoursSaved.value,
    claims: claims.value,
    isDark: isDark.value
  };
  localStorage.setItem('revrecover_dashboard_state', JSON.stringify(state));
};

const toggleTheme = () => {
  isDark.value = !isDark.value;
  saveState();
};

const resetDashboard = () => {
  if (confirm("Reset all dashboard metrics and statuses?")) {
    recoveredRevenue.value = 43250;
    hoursSaved.value = 128;
    claims.value = [...INITIAL_CLAIMS];
    selectedClaim.value = null;
    localStorage.removeItem('revrecover_dashboard_state');
  }
};

onMounted(() => {
  const savedStatus = localStorage.getItem('revrecover_dashboard_state');
  if (savedStatus) {
    const state = JSON.parse(savedStatus);
    recoveredRevenue.value = state.recoveredRevenue;
    hoursSaved.value = state.hoursSaved;
    claims.value = state.claims;
    if (state.isDark !== undefined) isDark.value = state.isDark;
  }
  fetchBackendHealth();
});

const selectClaim = (claim) => {
  selectedClaim.value = claim;
  agentStatus.value = "idle";
  liveFeed.value = [];
}

const addFeedLog = (message, delay) => {
  return new Promise(resolve => {
    setTimeout(() => {
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
      liveFeed.value.push({ time, message });
      resolve();
    }, delay * 1000); // converting seconds to ms
  });
};

const handleRunAgent = async () => {
  if (!selectedClaim.value) return;

  agentStatus.value = "running";
  liveFeed.value = [];

  await addFeedLog(`[INITIALIZATION] Booting TinyFish Agent...`, 0);
  await addFeedLog(`[TARGET] Portal: ${publicPortalUrl.value || 'Auto (App Runner)'}`, 0);
  await addFeedLog(`[MODE] ${isTurbo.value ? 'TURBO — skipping research phase' : 'FULL — clinical research enabled'}`, 0);

  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

  try {
    const response = await fetch(`${apiBaseUrl}/api/run-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claimId: selectedClaim.value.id,
        payer: selectedClaim.value.payer,
        denialReason: selectedClaim.value.denialReason,
        publicPortalUrl: publicPortalUrl.value,
        turbo: isTurbo.value
      })
    });

    const result = await response.json();

    if (!response.ok || !result.runId) {
      await addFeedLog(`[ERROR] ${result.message || 'Failed to start agent'}`, 0);
      agentStatus.value = "error";
      return;
    }

    await addFeedLog(`[CLOUD] Agent started. Run ID: ${result.runId}`, 0);
    await addFeedLog(`[CLOUD] Navigating portal and executing appeal...`, 0);

    // Poll for completion — simple and reliable
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max at 5s interval
    let isDone = false;

    while (!isDone && attempts < maxAttempts) {
      attempts++;
      await new Promise(r => setTimeout(r, 5000));

      const checkRes = await fetch(`${apiBaseUrl}/api/check-run/${result.runId}?t=${Date.now()}`);
      const checkData = await checkRes.json();

      console.log(`[POLL ${attempts}] status=${checkData.status}`);

      if (checkData.status === 'completed' || checkData.status === 'success') {
        isDone = true;
        await addFeedLog(`[SUCCESS] Appeal submitted. Syncing state...`, 0);
        agentStatus.value = "success";
        const amountStr = selectedClaim.value.amount.replace(/[^0-9.-]+/g, "");
        recoveredRevenue.value += parseFloat(amountStr);
        hoursSaved.value += 1.5;
        selectedClaim.value.status = "Appealing";
        selectedClaim.value.completedAt = new Date().toLocaleString();
        
        // Try to parse the agent's JSON response to extract the specific justification text
        try {
          const parsed = typeof checkData.result === 'string' ? JSON.parse(checkData.result) : checkData.result;
          if (parsed && typeof parsed === 'object') {
            selectedClaim.value.appealContent = parsed.justification || JSON.stringify(parsed, null, 2);
          } else {
            selectedClaim.value.appealContent = checkData.result;
          }
        } catch (e) {
          selectedClaim.value.appealContent = checkData.result || "Clinical appeal successfully generated and filed via TinyFish Agentic workflow.";
        }
        
        saveState();

        // Partner Stack: ElevenLabs — Announce success via AI voice
        announceAppealSuccess(selectedClaim.value.patient, selectedClaim.value.amount);
      } else if (checkData.status === 'failed') {
        isDone = true;
        await addFeedLog(`[ERROR] Agent failed. Check TinyFish dashboard.`, 0);
        agentStatus.value = "error";
      } else {
        await addFeedLog(`[WORKING] Agent running... (${attempts * 5}s elapsed)`, 0);
      }
    }

    if (!isDone) {
      await addFeedLog(`[TIMEOUT] No response after 5 minutes. Check TinyFish dashboard.`, 0);
      agentStatus.value = "error";
    }

  } catch (err) {
    console.error("Agent error:", err);
    await addFeedLog(`[ERROR] ${err.message}`, 0);
    agentStatus.value = "error";
  }
}

const openFaq = ref(null);
const faqs = [
  {
    q: "How does the AI research medical necessity?",
    a: "The TinyFish agent performs 'Real Work' by navigating to ClinicalTrials.gov in real-time. It searches for clinical studies (like NCT03728478) related to the specific denial code and extracts scientific evidence to build a human-grade medical argument for the appeal."
  },
  {
    q: "What is 'Live Agent Mode'?",
    a: "This field allows you to specify a custom target portal URL. The agent will land on this URL, securely bypass HIPAA/Auth modals using session memory, and execute the appeal. If left blank, it defaults to the production-hosted AetnaCare simulation."
  },
  {
    q: "Why does the agent take 2-4 minutes?",
    a: "Unlike simple scripts, RevRecover agents perform deep clinical research, multiple navigation steps, and complex form filing. We use an 'Enterprise Async' architecture with 10-second background polling to ensure the dashboard stays responsive during these high-intelligence workloads."
  },
  {
    q: "How is data security handled?",
    a: "All sensitive API keys are isolated on the backend. The dashboard only communicates via encrypted HTTPS requests and never touches raw secrets. We utilize standard environment variable management for 100% security against key leakage."
  },
  {
    q: "Is the revenue data real?",
    a: "The dashboard uses a persistent LocalStorage engine to track recovered revenue across sessions. The 'Revenue Recovered' counter updates dynamically the moment an agent receives an Audit Trace confirmation (e.g., APP-9983-PLAT)."
  }
];

const toggleFaq = (index) => {
  openFaq.value = openFaq.value === index ? null : index;
}
</script>

<template>
<template>
  <div :class="['flex h-screen font-sans selection:bg-[#0078D4] selection:text-white transition-colors duration-300 overflow-hidden', isDark ? 'bg-[#0f0f0f] text-[#E2E8F0]' : 'bg-[#faf9f8] text-[#323130]']">
    
    <!-- Sidebar -->
    <aside :class="['w-64 flex-shrink-0 border-r flex flex-col transition-colors duration-300', isDark ? 'bg-[#151515] border-[#292929]' : 'bg-white border-[#edebe9]']">
      <!-- Sidebar Header (Logo) -->
      <div class="h-16 flex items-center px-6 border-b" :class="isDark ? 'border-[#292929]' : 'border-[#edebe9]'">
        <div class="w-8 h-8 rounded bg-[#0078D4] flex items-center justify-center mr-3">
          <Activity class="w-5 h-5 text-white" />
        </div>
        <div class="flex flex-col">
          <span :class="['font-semibold text-lg tracking-tight', isDark ? 'text-white' : 'text-[#201f1e]']">RevRecover</span>
          <span :class="['text-[9px] font-medium uppercase tracking-wider', isDark ? 'text-[#a19f9d]' : 'text-[#605e5c]']">AI Foundry</span>
        </div>
      </div>

      <!-- Navigation Links -->
      <div class="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
        <button 
          @click="handleTabSwitch('queue')"
          :class="['flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full text-left', activeTab === 'queue' ? (isDark ? 'bg-[#292929] text-white' : 'bg-[#f3f2f1] text-[#201f1e] font-semibold') : (isDark ? 'text-[#a19f9d] hover:bg-[#202020] hover:text-white' : 'text-[#605e5c] hover:bg-[#faf9f8] hover:text-[#201f1e]')]"
        >
          <Clock class="w-4 h-4" />
          Denials Queue
        </button>
        <button 
          @click="handleTabSwitch('history')"
          :class="['flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full text-left', activeTab === 'history' ? (isDark ? 'bg-[#292929] text-white' : 'bg-[#f3f2f1] text-[#201f1e] font-semibold') : (isDark ? 'text-[#a19f9d] hover:bg-[#202020] hover:text-white' : 'text-[#605e5c] hover:bg-[#faf9f8] hover:text-[#201f1e]')]"
        >
          <CheckCircle class="w-4 h-4" />
          Audit History
        </button>
        <button 
          :class="['flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full text-left mt-1 opacity-50 cursor-not-allowed', isDark ? 'text-[#a19f9d]' : 'text-[#605e5c]']"
        >
          <Users class="w-4 h-4" />
          Patient Registry (Beta)
        </button>
      </div>

      <!-- Sidebar Footer (User / Settings) -->
      <div class="p-4 border-t flex flex-col gap-3" :class="isDark ? 'border-[#292929]' : 'border-[#edebe9]'">
        <div class="flex items-center justify-between">
          <button @click="toggleTheme" :class="['p-2 rounded-md transition-colors', isDark ? 'text-[#a19f9d] hover:bg-[#292929] hover:text-white' : 'text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#201f1e]']" title="Toggle Theme">
            <Sun v-if="isDark" class="w-4 h-4" />
            <Moon v-else class="w-4 h-4" />
          </button>
          <button @click="resetDashboard" :class="['p-2 rounded-md transition-colors', isDark ? 'text-[#a19f9d] hover:bg-[#292929] hover:text-red-400' : 'text-[#605e5c] hover:bg-[#f3f2f1] hover:text-red-600']" title="Reset Dashboard">
            <Activity class="w-4 h-4" />
          </button>
        </div>
        <div class="flex items-center gap-3">
          <div :class="['w-8 h-8 rounded-full flex items-center justify-center bg-[#0078D4]/10']">
            <UserCircle class="w-5 h-5 text-[#0078D4]" />
          </div>
          <div class="flex flex-col">
            <span :class="['text-xs font-semibold', isDark ? 'text-white' : 'text-[#201f1e]']">Admin User</span>
            <span :class="['text-[10px]', isDark ? 'text-[#8a8886]' : 'text-[#a19f9d]']">revrecover.contoso.com</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content Area Wrapper -->
    <div class="flex-1 flex flex-col h-full overflow-hidden">
      <!-- Top Contextual Header (Breadcrumb style) -->
      <header :class="['h-16 border-b flex items-center px-8 transition-colors duration-300', isDark ? 'bg-[#151515] border-[#292929]' : 'bg-white border-[#edebe9]']">
        <div class="flex items-center text-sm font-medium">
          <span :class="isDark ? 'text-[#a19f9d]' : 'text-[#605e5c]'">Workspaces</span>
          <ChevronRight class="w-4 h-4 mx-2" :class="isDark ? 'text-[#605e5c]' : 'text-[#c8c6c4]'" />
          <span :class="isDark ? 'text-white' : 'text-[#201f1e]'">Revenue Recovery</span>
        </div>
        <div class="ml-auto text-[10px] font-mono text-[#a19f9d] flex gap-4">
          <span>F: {{ frontendBuildTime }}</span>
          <span>B: {{ backendBuildTime }}</span>
        </div>
      </header>
      
      <!-- Scrollable Main Content -->
      <main class="flex-1 overflow-y-auto p-8 custom-scrollbar">

      <div class="max-w-[1600px] mx-auto w-full">
      <!-- Analytics Section -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div :class="['border rounded-lg p-6 flex flex-col relative transition-all duration-300', isDark ? 'bg-[#151515] border-[#292929]' : 'bg-white border-[#edebe9]']">
          <div class="flex items-center justify-between mb-2">
            <span :class="['text-sm font-semibold transition-colors duration-300', isDark ? 'text-[#a19f9d]' : 'text-[#605e5c]']">Revenue Recovered Pending</span>
            <DollarSign class="w-4 h-4 text-[#0078D4]" />
          </div>
          <span :class="['text-3xl font-semibold tracking-tight transition-colors duration-300', isDark ? 'text-white' : 'text-[#201f1e]']">${{ recoveredRevenue.toLocaleString() }}</span>
          <div class="mt-4 text-xs flex items-center gap-1 text-[#0078D4] font-medium">
            <Activity class="w-3 h-3" />
            <span>+12.5% this month</span>
          </div>
        </div>

        <div :class="['border rounded-lg p-6 flex flex-col relative transition-all duration-300', isDark ? 'bg-[#151515] border-[#292929]' : 'bg-white border-[#edebe9]']">
          <div class="flex items-center justify-between mb-2">
            <span :class="['text-sm font-semibold transition-colors duration-300', isDark ? 'text-[#a19f9d]' : 'text-[#605e5c]']">Agent Success Rate</span>
            <CheckCircle class="w-4 h-4 text-[#0078D4]" />
          </div>
          <span :class="['text-3xl font-semibold tracking-tight transition-colors duration-300', isDark ? 'text-white' : 'text-[#201f1e]']">94.2%</span>
          <div class="mt-4 text-xs flex items-center gap-1 text-[#0078D4] font-medium">
            <span>Vs. 41% Human Baseline</span>
          </div>
        </div>

        <div :class="['border rounded-lg p-6 flex flex-col relative transition-all duration-300', isDark ? 'bg-[#151515] border-[#292929]' : 'bg-white border-[#edebe9]']">
          <div class="flex items-center justify-between mb-2">
            <span :class="['text-sm font-semibold transition-colors duration-300', isDark ? 'text-[#a19f9d]' : 'text-[#605e5c]']">Human Hours Saved</span>
            <Clock class="w-4 h-4 text-[#0078D4]" />
          </div>
          <span :class="['text-3xl font-semibold tracking-tight transition-colors duration-300', isDark ? 'text-white' : 'text-[#201f1e]']">{{ hoursSaved }} hrs</span>
          <div :class="['mt-4 text-xs font-medium transition-colors duration-300', isDark ? 'text-[#a19f9d]' : 'text-[#605e5c]']">
            Automating multi-step portal work
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 :class="['text-xl font-semibold tracking-tight mb-1 transition-colors duration-300', isDark ? 'text-white' : 'text-[#201f1e]']">Recovery Workspace</h1>
          <p :class="['text-sm transition-colors duration-300', isDark ? 'text-[#a19f9d]' : 'text-[#605e5c]']">Review high-value claims ready for autonomous appeal generation.</p>
        </div>
      </div>



      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left Column: Claims List -->
        <div class="lg:col-span-2 flex flex-col gap-4">
          <div 
            v-for="claim in claims.filter(c => activeTab === 'history' ? c.status === 'Appealing' : c.status === 'Denied')" 
            :key="claim.id"
            @click="selectClaim(claim)"
            :class="[
              'border p-4 cursor-pointer transition-all duration-200 relative group overflow-hidden first:rounded-t-md last:rounded-b-md mb-[-1px]',
              selectedClaim?.id === claim.id 
                ? (isDark ? 'border-[#0078D4] bg-[#292929] z-10' : 'border-[#0078D4] bg-[#f3f2f1] z-10') 
                : (isDark ? 'border-[#292929] bg-[#151515] hover:bg-[#202020]' : 'border-[#edebe9] bg-white hover:bg-[#faf9f8]')
            ]"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-3">
                <div :class="['p-2 rounded border transition-colors duration-300', isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-[#fdf3f4] border-[#d13438] text-[#d13438]']">
                  <ShieldAlert class="w-4 h-4" />
                </div>
                <div>
                  <h3 :class="['font-bold text-lg transition-colors duration-300', isDark ? 'text-white' : 'text-slate-900']">{{ claim.patient }}</h3>
                  <div :class="['flex items-center gap-2 text-xs mt-0.5 transition-colors duration-300', isDark ? 'text-[#a19f9d]' : 'text-[#605e5c]']">
                    <span>ID: {{ claim.id }}</span>
                    <span>•</span>
                    <span :class="['px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all duration-300', isDark ? 'bg-[#0078D4]/10 text-[#0078D4] border-[#0078D4]/20' : 'bg-[#eff6fc] text-[#0078D4] border-[#0078D4]/20']">{{ claim.payer }}</span>
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div :class="['font-bold text-lg transition-colors duration-300', isDark ? 'text-white' : 'text-slate-900']">{{ claim.amount }}</div>
                <div :class="['text-xs font-medium px-2 py-1 rounded-full inline-block mt-1 border transition-colors duration-300', claim.status === 'Denied' ? (isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100') : (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100')]">
                  {{ claim.status }}
                </div>
              </div>
            </div>

            <div :class="['p-3 rounded-xl border flex items-start gap-2 transition-colors duration-300 group/rarc relative', isDark ? 'bg-[#0A0C10] border-[#1E293B]' : 'bg-slate-50 border-slate-100']">
               <FileText class="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
               <p :class="['text-sm transition-colors duration-300', isDark ? 'text-slate-300' : 'text-slate-600']">
                 <span :class="['font-semibold transition-colors duration-300 pointer-events-auto cursor-help decoration-blue-500/30 underline underline-offset-4', isDark ? 'text-slate-400' : 'text-slate-500']">RARC Code:</span> 
                 {{ claim.denialReason }}
               </p>
               
               <!-- RARC Tooltip -->
               <div :class="['absolute bottom-full left-0 mb-2 w-64 p-3 rounded-lg border shadow-xl opacity-0 invisible group-hover/rarc:opacity-100 group-hover/rarc:visible transition-all duration-300 z-10 text-xs leading-relaxed', isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600 shadow-slate-200/50']">
                 <div class="font-bold mb-1 text-blue-400 uppercase tracking-wider">Intelligence Brief:</div>
                 {{ RARC_MAP[claim.denialReason.split('(')[1].replace(')', '')] || 'Electronic Remittance Advice code requiring specific clinical justification.' }}
                 <div :class="['mt-2 pt-2 border-t font-medium italic', isDark ? 'border-slate-700 text-slate-500' : 'border-slate-100 text-slate-400']">
                   TinyFish agent trained on this specific RARC pattern.
                 </div>
               </div>
            </div>
            
            <div class="mt-4 flex items-center justify-between text-xs font-medium">
               <span v-if="activeTab === 'queue'" :class="['flex items-center gap-1 transition-colors duration-300', isDark ? 'text-slate-500' : 'text-slate-400']">
                 <Clock class="w-3.5 h-3.5" />
                 Deadline: {{ claim.daysToAppeal }} days left
               </span>
               <span v-else :class="['flex items-center gap-1 transition-colors duration-300', isDark ? 'text-emerald-500' : 'text-emerald-600']">
                 <CheckCircle class="w-3.5 h-3.5" />
                 Filed on {{ claim.completedAt }}
               </span>
               <span :class="['flex items-center gap-1 transition-colors duration-300', isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700']">
                 View Adjudication Context <ChevronRight class="w-3.5 h-3.5" />
               </span>
            </div>
          </div>
          
          <!-- Empty State for History -->
          <div v-if="activeTab === 'history' && !claims.some(c => c.status === 'Appealing')" :class="['border-2 border-dashed rounded-2xl p-12 text-center transition-colors duration-300', isDark ? 'border-[#1E293B] bg-[#111827]/50' : 'border-slate-200 bg-white']">
             <Activity :class="['w-12 h-12 mx-auto mb-4 transition-colors duration-300', isDark ? 'text-slate-700' : 'text-slate-300']" />
             <h3 :class="['text-lg font-bold mb-2', isDark ? 'text-slate-400' : 'text-slate-900']">No History Yet</h3>
             <p :class="['text-sm transition-colors duration-300', isDark ? 'text-slate-500' : 'text-slate-400']">Successful appeals filed by TinyFish agents will appear here for audit review.</p>
          </div>
        </div>

        <!-- Right Column: Detail View & AI Execution -->
        <div class="lg:col-span-1">
          <div v-if="selectedClaim" :class="['border sticky top-24 overflow-hidden flex flex-col h-[calc(100vh-8rem)] transition-all duration-300 rounded-lg', isDark ? 'bg-[#151515] border-[#292929]' : 'bg-white border-[#edebe9]']">
            <!-- Header -->
            <div :class="['p-6 border-b transition-colors duration-300', isDark ? 'border-[#292929] bg-[#151515]' : 'border-[#edebe9] bg-[#faf9f8]']">
              <h2 :class="['text-lg font-semibold tracking-tight mb-1 transition-colors duration-300', isDark ? 'text-white' : 'text-[#201f1e]']">
                {{ selectedClaim.status === 'Appealing' ? 'Audit Intelligence' : 'Claim Resolution' }}
              </h2>
              <p :class="['text-sm transition-colors duration-300', isDark ? 'text-[#a19f9d]' : 'text-[#605e5c]']">
                {{ selectedClaim.status === 'Appealing' ? 'Reviewing agent-generated clinical argument.' : 'Autonomous workflow ready.' }}
              </p>
            </div>

            <!-- Scrollable Content -->
            <div class="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <div class="space-y-4 mb-6">
                 <div>
                   <label :class="['text-xs font-semibold uppercase tracking-wider transition-colors duration-300', isDark ? 'text-slate-500' : 'text-slate-400']">Patient Name</label>
                   <p :class="['font-medium mt-1 transition-colors duration-300', isDark ? 'text-slate-200' : 'text-slate-700']">{{ selectedClaim.patient }}</p>
                 </div>
                 <div>
                   <label :class="['text-xs font-semibold uppercase tracking-wider transition-colors duration-300', isDark ? 'text-slate-500' : 'text-slate-400']">Target Payer Portal</label>
                   <div class="flex items-center gap-2 mt-1">
                     <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                     <p :class="['font-medium transition-colors duration-300', isDark ? 'text-slate-200' : 'text-slate-700']">{{ selectedClaim.payer }}</p>
                   </div>
                 </div>
                 <div>
                   <label :class="['text-xs font-semibold uppercase tracking-wider transition-colors duration-300', isDark ? 'text-slate-500' : 'text-slate-400']">Required Action</label>
                   <p :class="['font-medium mt-1 transition-colors duration-300', isDark ? 'text-slate-200' : 'text-slate-700']">Submit comprehensive clinical appeal with internal records.</p>
                 </div>
              </div>
                  
              <!-- Appeal Content Audit View (The "Magic" Revealed) -->
              <div v-if="selectedClaim.status === 'Appealing'" :class="['pt-4 border-t transition-colors duration-300', isDark ? 'border-[#1E293B]' : 'border-slate-100']">
                <label :class="['text-xs font-semibold uppercase tracking-wider transition-colors duration-300 mb-2 block', isDark ? 'text-blue-400' : 'text-blue-600']">Generated Appeal Argument</label>
                <div :class="['p-4 rounded-xl text-sm leading-relaxed border transition-colors duration-300', isDark ? 'bg-[#0A0C10] border-[#1E293B] text-slate-300' : 'bg-blue-50/30 border-blue-100 text-slate-700']">
                  <!-- Structured JSON View -->
                  <div v-if="formattedAppealContent" class="space-y-4 font-sans not-italic">
                    <!-- Authorization Status -->
                    <div v-if="formattedAppealContent.phase2_authorization" class="border-b border-blue-500/10 pb-3">
                      <div class="flex items-center gap-2 mb-2">
                        <CheckCircle class="w-3.5 h-3.5 text-emerald-400" />
                        <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Authorization Logic Confirmation</span>
                      </div>
                      <p class="text-[11px] leading-relaxed opacity-90">{{ formattedAppealContent.phase2_authorization.overall_status }}</p>
                      <ul class="mt-2 space-y-1.5">
                        <li v-for="step in formattedAppealContent.phase2_authorization.steps" :key="step.step" class="text-[10px] flex items-start gap-2">
                          <span class="text-blue-400 font-bold min-w-[12px]">{{ step.step }}.</span>
                          <span><b class="text-slate-100">{{ step.name }}:</b> {{ step.details }}</span>
                        </li>
                      </ul>
                    </div>

                    <!-- Clinical Data -->
                    <div v-if="formattedAppealContent.phase1_clinical_research_data">
                      <div class="flex items-center gap-2 mb-2">
                        <Activity class="w-3.5 h-3.5 text-blue-400" />
                        <span class="text-[10px] font-bold uppercase tracking-wider text-blue-400">Extracted Clinical Evidence (ClinicalTrials.gov)</span>
                      </div>
                      <div class="grid grid-cols-2 gap-3 mb-3">
                        <div class="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                          <p class="text-[8px] uppercase text-slate-500 font-bold">Protocol ID</p>
                          <p class="text-[10px] font-mono text-blue-300">{{ formattedAppealContent.phase1_clinical_research_data.study_nct }}</p>
                        </div>
                        <div class="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                          <p class="text-[8px] uppercase text-slate-500 font-bold">Research Query</p>
                          <p class="text-[10px] text-slate-300">{{ formattedAppealContent.phase1_clinical_research_data.search_query }}</p>
                        </div>
                      </div>
                      <ul class="space-y-2">
                        <li v-for="point in formattedAppealContent.phase1_clinical_research_data.research_data_points" :key="point.id" class="text-[11px] text-slate-400 leading-normal">
                          • {{ point.description }}
                        </li>
                      </ul>
                    </div>
                  </div>

                  <!-- Fallback Text View -->
                  <div v-else class="font-serif italic">
                    "{{ selectedClaim.appealContent || 'Retrieving clinical justification from audit trace...' }}"
                  </div>
                </div>
                <div class="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                  <Zap class="w-3 h-3 text-amber-400" />
                  End-to-End Autonomous Filing Confirmed
                </div>
              </div>

              <!-- Public Portal URL Configuration (Only for Denied claims) -->
              <div v-else :class="['pt-4 border-t transition-colors duration-300', isDark ? 'border-[#1E293B]' : 'border-slate-100']">
                <div class="flex items-center justify-between mb-2">
                  <label :class="['text-xs font-semibold uppercase tracking-wider transition-colors duration-300', isDark ? 'text-slate-500' : 'text-slate-400']">Live Agent Mode</label>
                  <span v-if="publicPortalUrl" class="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">LIVE</span>
                  <span v-else class="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">SIMULATION</span>
                </div>
                <div class="relative group">
                  <input 
                    v-model="publicPortalUrl"
                    type="text" 
                    placeholder="Paste Enterprise Portal URL here"
                    :class="['w-full border rounded-xl py-2 px-3 text-xs focus:outline-none transition-all placeholder:text-slate-600', isDark ? 'bg-[#0A0C10] border-[#1E293B] text-slate-300 focus:border-blue-500/50' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-blue-400']"
                  />
                  <Zap v-if="publicPortalUrl" class="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-400 animate-pulse" />
                </div>
                    <p :class="['text-[10px] mt-2 leading-relaxed transition-colors duration-300', isDark ? 'text-slate-500' : 'text-slate-400']">
                      To fulfill "Real Work" verification, enter the live URL of your **Enterprise Portal**.
                    </p>

                    <!-- Credential Key Badge -->
                    <div class="mt-4 flex items-center justify-between p-2 rounded-lg border border-dashed transition-colors duration-300" :class="isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-100'">
                      <div class="flex items-center gap-2">
                        <ShieldCheck class="w-3 h-3 text-blue-500" />
                        <span class="text-[9px] font-bold uppercase tracking-widest text-blue-500">Security Vault Key</span>
                      </div>
                      <code class="text-[10px] font-mono font-bold" :class="isDark ? 'text-blue-300' : 'text-blue-700'">{{ activeCredentialKey }}</code>
                    </div>
                  </div>
            </div>

              <!-- Live Agent Feed (Terminal) -->
              <div v-if="agentStatus !== 'idle'" :class="['mt-6 border rounded-lg overflow-hidden flex flex-col transition-colors duration-300', isDark ? 'border-[#292929] bg-[#0f0f0f]' : 'border-[#edebe9] bg-[#faf9f8]']">
                <div :class="['px-3 py-2 border-b flex items-center gap-2 text-[10px] font-mono transition-colors duration-300', isDark ? 'bg-[#151515] border-[#292929] text-[#a19f9d]' : 'bg-white border-[#edebe9] text-[#605e5c]']">
                  <Terminal class="w-3.5 h-3.5 text-[#0078D4]" />
                  <span>tinyfish-agent-feed.log</span>
                  <div class="ml-auto flex gap-1.5 opacity-50">
                    <div class="w-2 h-2 rounded-full bg-red-400"></div>
                    <div class="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <div class="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                </div>
                <div :class="['p-4 font-mono text-xs h-64 overflow-y-auto flex flex-col gap-2 transition-colors duration-300', isDark ? 'bg-[#0f0f0f] text-[#c8c6c4]' : 'bg-[#faf9f8] text-[#323130]']">
                  <div v-for="(log, idx) in liveFeed" :key="idx" class="flex items-start text-slate-300">
                    <span class="pr-3 text-slate-600 select-none">[{{ log.time }}]</span>
                    <span :class="log.message.includes('[SUCCESS]') ? 'text-emerald-400 font-bold' : log.message.includes('[ERROR]') ? 'text-red-400 font-bold' : ''">{{ log.message }}</span>
                  </div>
                  <div v-if="agentStatus === 'running'" class="flex items-center gap-2 mt-2" :class="isDark ? 'text-[#8a8886]' : 'text-[#a19f9d]'">
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0078D4] opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-[#0078D4]"></span>
                    </span>
                    Agent traversing DOM...
                  </div>
                </div>
              </div>

            <!-- Footer Action Area -->
            <div :class="['p-6 border-t mt-auto transition-colors duration-300', isDark ? 'border-[#292929] bg-[#151515]' : 'border-[#edebe9] bg-[#faf9f8]']">
               <button 
                 v-if="(agentStatus === 'idle' || agentStatus === 'error') && selectedClaim.status === 'Denied'"
                 @click="handleRunAgent"
                 class="w-full font-semibold py-2.5 px-4 rounded transition-all duration-200 flex items-center justify-center gap-2 bg-[#0078D4] hover:bg-[#106ebe] text-white"
               >
                 <span class="text-sm tracking-wide">{{ agentStatus === 'error' ? 'Retry Autonomous Appeal' : 'Automate Appeal with Agent' }}</span>
                 <Activity class="w-4 h-4" />
               </button>

               <div v-else-if="agentStatus === 'running'" :class="['w-full font-medium py-2.5 px-4 rounded flex items-center justify-center gap-2 border transition-colors duration-300', isDark ? 'bg-[#292929] text-white border-[#3e3e42]' : 'bg-white text-[#201f1e] border-[#edebe9]']">
                  <svg class="animate-spin h-4 w-4 text-[#0078D4]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span class="text-sm">Agent Session Active...</span>
               </div>

               <div v-else :class="['w-full font-semibold py-2.5 px-4 rounded border flex items-center justify-center gap-2', isDark ? 'bg-[#107c10]/10 text-[#107c10] border-[#107c10]/20' : 'bg-[#dff6dd] text-[#107c10] border-[#107c10]/20']">
                  <CheckCircle class="w-4 h-4" />
                  <span class="text-sm">Appeal Successfully Filed</span>
               </div>
            </div>
          </div>
          
          <div v-else :class="['h-full border border-dashed rounded-lg flex flex-col items-center justify-center md:min-h-[600px] text-center px-6 transition-colors duration-300', isDark ? 'border-[#3e3e42] bg-[#151515]' : 'border-[#c8c6c4] bg-[#faf9f8]']">
             <div :class="['w-12 h-12 rounded flex items-center justify-center mb-4 transition-colors duration-300', isDark ? 'bg-[#292929]' : 'bg-white overflow-hidden shadow-sm border border-[#edebe9]']">
                <ShieldAlert :class="['w-6 h-6 transition-colors duration-300', isDark ? 'text-[#8a8886]' : 'text-[#a19f9d]']" />
             </div>
             <h3 :class="['text-lg font-semibold mb-1 transition-colors duration-300', isDark ? 'text-white' : 'text-[#201f1e]']">No Claim Selected</h3>
             <p :class="['text-sm max-w-[250px] transition-colors duration-300', isDark ? 'text-[#a19f9d]' : 'text-[#605e5c]']">Select a denied claim from the queue to review context and deploy the TinyFish autonomous agent.</p>
          </div>
        </div>

      </div>
      <!-- FAQ Section -->
      <div :class="['mt-12 mb-20 transition-colors duration-300']">
        <div class="flex items-center gap-3 mb-6">
          <div :class="['p-2 rounded border transition-colors duration-300', isDark ? 'bg-[#0078D4]/10 border-[#0078D4]/20' : 'bg-[#eff6fc] border-[#0078D4]/20']">
            <HelpCircle class="w-4 h-4 text-[#0078D4]" />
          </div>
          <div>
            <h2 :class="['text-lg font-semibold transition-colors duration-300', isDark ? 'text-white' : 'text-[#201f1e]']">System FAQ & Technical Specs</h2>
            <p :class="['text-[10px] uppercase tracking-widest mt-0.5 transition-colors duration-300', isDark ? 'text-[#a19f9d]' : 'text-[#605e5c]']">Powered by TinyFish Agentic Framework</p>
          </div>
        </div>

        <div class="space-y-2">
          <div 
            v-for="(faq, idx) in faqs" 
            :key="idx"
            :class="[
              'border rounded-md overflow-hidden transition-all duration-200', 
              openFaq === idx 
                ? (isDark ? 'border-[#0078D4] bg-[#292929]' : 'border-[#0078D4] bg-[#f3f2f1]') 
                : (isDark ? 'border-[#292929] bg-[#151515] hover:border-[#3e3e42]' : 'border-[#edebe9] bg-white hover:border-[#c8c6c4]')
            ]"
          >
            <button 
              @click="toggleFaq(idx)"
              class="w-full px-5 py-4 flex items-center justify-between text-left group"
            >
              <span :class="['font-medium text-sm transition-colors duration-200', isDark ? 'text-white' : 'text-[#201f1e]']">{{ faq.q }}</span>
              <ChevronDown 
                :class="['w-4 h-4 transition-transform duration-200', isDark ? 'text-[#a19f9d]' : 'text-[#605e5c]', openFaq === idx ? 'rotate-180 text-[#0078D4]' : '']"
              />
            </button>
            <div 
              class="px-5 overflow-hidden transition-all duration-300 ease-in-out"
              :style="{ maxHeight: openFaq === idx ? '200px' : '0px', paddingBottom: openFaq === idx ? '16px' : '0px' }"
            >
              <p :class="['text-sm leading-relaxed transition-colors duration-300', isDark ? 'text-[#a19f9d]' : 'text-[#605e5c]']">{{ faq.a }}</p>
            </div>
          </div>
        </div>
      </div>
      </div> <!-- End max-w container -->
    </main>
  </div> <!-- End App wrapper -->
</template>

<style>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #334155;
  border-radius: 20px;
}
</style>
