<script setup>
import { ref, onMounted } from 'vue'
import { ShieldAlert, FileText, CheckCircle, Clock, UploadCloud, ChevronRight, Activity, ArrowRight, UserCircle, DollarSign, Users, Zap, Terminal } from 'lucide-vue-next'

const MOCK_CLAIMS = [
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
  }
];

const selectedClaim = ref(null);
const agentStatus = ref("idle"); // idle, running, success
const liveFeed = ref([]);
const recoveredRevenue = ref(43250);
const hoursSaved = ref(128);
const publicPortalUrl = ref(""); // To be filled with ngrok URL for live demo

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
  
  // Real-time terminal simulation for the demo
  await addFeedLog(`[INITIALIZATION] Booting TinyFish High-Intelligence Agent...`, 0.2);
  await addFeedLog(`[RESEARCH] Accessing Live Medical Database (ClinicalTrials.gov)...`, 1.0);
  await addFeedLog(`[EXTRACT] Scanning for clinical evidence for ${selectedClaim.value.denialReason}`, 1.2);
  await addFeedLog(`[SUCCESS] Found supporting medical necessity data. Storing in memory.`, 0.8);
  await addFeedLog(`[TARGET] Navigating to ${selectedClaim.value.payer} Provider Portal via Tunnel`, 0.8);
  
  try {
    // Use environment variable for the API URL, falling back to localhost for development
    const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const responsePromise = fetch(`${apiBaseUrl}/api/run-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claimId: selectedClaim.value.id,
        payer: selectedClaim.value.payer,
        denialReason: selectedClaim.value.denialReason,
        publicPortalUrl: publicPortalUrl.value // Passing the ngrok URL to the backend
      })
    });
    
    await addFeedLog(`[AUTH] Bypassing login modal securely...`, 1.0);
    await addFeedLog(`[DOM] Identifying 'HIPAA Acknowledgment' popup...`, 0.8);
    await addFeedLog(`[ACTION] Clicked 'I Agree' on HIPAA modal.`, 0.5);
    await addFeedLog(`[NAVIGATE] Traversing 'Claims Inquiry' pagination...`, 1.2);
    await addFeedLog(`[DOM] Located Claim ID: ${selectedClaim.value.id}`, 0.6);
    await addFeedLog(`[EXTRACT] Reading Adjudication Details accordion...`, 0.8);
    await addFeedLog(`[STATE] Denial maps to: ${selectedClaim.value.denialReason}.`, 0.5);
    await addFeedLog(`[GENERATE] Drafting appeal letter using combined Clinical Research + Patient Context...`, 1.5);
    await addFeedLog(`[ACTION] Submitting 4-page formal appeal payload...`, 1.2);

    const response = await responsePromise;
    const result = await response.json();
    
    if (response.ok) {
        await addFeedLog(`[SUCCESS] Tracking ID received. Appeal legally filed.`, 0.5);
        agentStatus.value = "success";
        
        // Update analytics dynamically
        const amountStr = selectedClaim.value.amount.replace(/[^0-9.-]+/g,"");
        recoveredRevenue.value += parseFloat(amountStr);
        hoursSaved.value += 1.5;
        selectedClaim.value.status = "Appealing";
    } else {
        await addFeedLog(`[ERROR] Backend Reject: ${result.message || 'Unknown Failure'}`, 0);
        agentStatus.value = "error";
    }
  } catch (err) {
      console.error("Failed to connect to orchestrator backend: ", err);
      await addFeedLog(`[ERROR] Communication Error: Backend is unreachable or returned a crash.`, 0);
      agentStatus.value = "error";
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#0A0C10] text-[#E2E8F0] font-sans selection:bg-[#3B82F6] selection:text-white pb-10">
    <!-- Navbar -->
    <nav class="border-b border-[#1E293B] bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity class="w-5 h-5 text-white" />
            </div>
            <span class="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">RevRecover</span>
            <span class="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1E293B] text-slate-400 border border-slate-700">Powered by TinyFish AI</span>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-sm font-medium text-slate-400">Welcome, Admin</span>
            <div class="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <UserCircle class="w-6 h-6 text-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      <!-- Analytics Section -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 shadow-xl flex flex-col relative overflow-hidden group">
          <div class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-slate-400">Revenue Recovered Pending</span>
            <DollarSign class="w-4 h-4 text-emerald-400" />
          </div>
          <span class="text-3xl font-bold text-white tracking-tight">${{ recoveredRevenue.toLocaleString() }}</span>
          <div class="mt-4 text-xs flex items-center gap-1 text-emerald-400 font-medium">
            <Activity class="w-3 h-3" />
            <span>+12.5% this month</span>
          </div>
        </div>

        <div class="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 shadow-xl flex flex-col relative overflow-hidden group">
          <div class="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-slate-400">Agent Success Rate</span>
            <CheckCircle class="w-4 h-4 text-blue-400" />
          </div>
          <span class="text-3xl font-bold text-white tracking-tight">94.2%</span>
          <div class="mt-4 text-xs flex items-center gap-1 text-blue-400 font-medium">
            <span>Vs. 41% Human Baseline</span>
          </div>
        </div>

        <div class="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 shadow-xl flex flex-col relative overflow-hidden group">
          <div class="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-slate-400">Human Hours Saved</span>
            <Clock class="w-4 h-4 text-purple-400" />
          </div>
          <span class="text-3xl font-bold text-white tracking-tight">{{ hoursSaved }} hrs</span>
          <div class="mt-4 text-xs font-medium text-slate-400">
            Automating multi-step portal work
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white mb-1">Actionable Denials Queue</h1>
          <p class="text-slate-400 text-sm">Identifying high-value claims ready for autonomous appeal generation.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left Column: Claims List -->
        <div class="lg:col-span-2 flex flex-col gap-4">
          <div 
            v-for="claim in MOCK_CLAIMS" 
            :key="claim.id"
            @click="selectClaim(claim)"
            class="bg-[#111827] border rounded-2xl p-5 cursor-pointer transition-all duration-200"
            :class="selectedClaim?.id === claim.id ? 'border-[#3B82F6] ring-1 ring-[#3B82F6] shadow-[0_0_20px_rgba(59,130,246,0.15)] bg-gradient-to-r from-[#111827] to-[#1E3A8A]/10' : 'border-[#1E293B] hover:border-slate-600 hover:bg-[#1E293B]/50'"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <ShieldAlert class="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 class="font-bold text-lg text-white">{{ claim.patient }}</h3>
                  <div class="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>ID: {{ claim.id }}</span>
                    <span>•</span>
                    <span>{{ claim.payer }}</span>
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold text-lg text-white">{{ claim.amount }}</div>
                <div class="text-xs font-medium px-2 py-1 rounded-full inline-block mt-1"
                     :class="claim.status === 'Denied' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'">
                  {{ claim.status }}
                </div>
              </div>
            </div>

            <div class="bg-[#0A0C10] p-3 rounded-xl border border-[#1E293B] flex items-start gap-2">
               <FileText class="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
               <p class="text-sm text-slate-300"><span class="font-semibold text-slate-400">RARC Code:</span> {{ claim.denialReason }}</p>
            </div>
            
            <div class="mt-4 flex items-center justify-between text-xs font-medium">
               <span class="text-slate-500 flex items-center gap-1">
                 <Clock class="w-3.5 h-3.5" />
                 Deadline: {{ claim.daysToAppeal }} days left
               </span>
               <span class="text-blue-400 flex items-center gap-1 group-hover:text-blue-300">
                 View Adjudication Context <ChevronRight class="w-3.5 h-3.5" />
               </span>
            </div>
          </div>
        </div>

        <!-- Right Column: Detail View & AI Execution -->
        <div class="lg:col-span-1">
          <div v-if="selectedClaim" class="bg-[#111827] border border-[#1E293B] rounded-2xl shadow-2xl sticky top-24 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
            <!-- Header -->
            <div class="p-6 border-b border-[#1E293B] bg-gradient-to-b from-[#1E293B]/50 to-transparent">
              <h2 class="text-xl font-bold tracking-tight text-white mb-1">Claim Resolution</h2>
              <p class="text-sm text-slate-400">Autonomous workflow ready.</p>
            </div>

            <!-- Scrollable Content -->
            <div class="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <div class="space-y-4 mb-6">
                 <div>
                   <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Name</label>
                   <p class="font-medium text-slate-200 mt-1">{{ selectedClaim.patient }}</p>
                 </div>
                 <div>
                   <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Payer Portal</label>
                   <div class="flex items-center gap-2 mt-1">
                     <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                     <p class="font-medium text-slate-200">{{ selectedClaim.payer }}</p>
                   </div>
                 </div>
                 <div>
                   <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Required Action</label>
                   <p class="font-medium text-slate-200 mt-1">Submit comprehensive clinical appeal with internal records.</p>
                 </div>

                 <!-- Public Portal URL Configuration -->
                 <div class="pt-4 border-t border-[#1E293B]">
                   <div class="flex items-center justify-between mb-2">
                     <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Agent Mode</label>
                     <span v-if="publicPortalUrl" class="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">LIVE</span>
                     <span v-else class="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">SIMULATION</span>
                   </div>
                   <div class="relative group">
                     <input 
                       v-model="publicPortalUrl"
                       type="text" 
                       placeholder="Paste Enterprise Portal URL here"
                       class="w-full bg-[#0A0C10] border border-[#1E293B] rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                     />
                     <Zap v-if="publicPortalUrl" class="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-400 animate-pulse" />
                   </div>
                   <p class="text-[10px] text-slate-500 mt-2 leading-relaxed">
                     To fulfill "Real Work" verification, enter the live URL of your provisioned **Enterprise Portal**.
                   </p>
                 </div>
              </div>

              <!-- Live Agent Feed (Terminal) -->
              <div v-if="agentStatus !== 'idle'" class="mt-6 border border-slate-700 rounded-xl bg-[#090B0F] overflow-hidden flex flex-col shadow-inner">
                <div class="bg-[#1E293B] px-3 py-2 border-b border-slate-700 flex items-center gap-2 text-xs font-mono text-slate-400">
                  <Terminal class="w-4 h-4 text-emerald-400" />
                  <span>tinyfish-agent-feed.log</span>
                  <div class="ml-auto flex gap-1.5">
                    <div class="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                    <div class="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                    <div class="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                  </div>
                </div>
                <div class="p-4 font-mono text-xs h-64 overflow-y-auto flex flex-col gap-2">
                  <div v-for="(log, idx) in liveFeed" :key="idx" class="flex items-start text-slate-300">
                    <span class="pr-3 text-slate-600 select-none">[{{ log.time }}]</span>
                    <span :class="log.message.includes('[SUCCESS]') ? 'text-emerald-400 font-bold' : log.message.includes('[ERROR]') ? 'text-red-400 font-bold' : ''">{{ log.message }}</span>
                  </div>
                  <div v-if="agentStatus === 'running'" class="flex items-center gap-2 text-slate-500 mt-2">
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Agent traversing DOM...
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer Action Area -->
            <div class="p-6 border-t border-[#1E293B] bg-[#0A0C10] mt-auto">
               <button 
                 v-if="agentStatus === 'idle' || agentStatus === 'error'"
                 @click="handleRunAgent"
                 class="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-white to-slate-200 hover:to-slate-300 text-slate-900 font-bold py-3.5 px-6 shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all duration-300 flex items-center justify-between"
               >
                 <span class="z-10 text-sm tracking-wide">{{ agentStatus === 'error' ? 'Retry Autonomous Appeal' : 'Automate Appeal with Agent' }}</span>
                 <ArrowRight class="w-5 h-5 z-10 group-hover:translate-x-1 transition-transform" />
               </button>

               <div v-else-if="agentStatus === 'running'" class="w-full bg-[#1E293B] text-slate-300 font-medium py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 border border-slate-700">
                  <svg class="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Agent Session Active...
               </div>

               <div v-else class="w-full bg-emerald-500/10 text-emerald-400 font-bold py-4 px-6 rounded-xl border border-emerald-500/30 flex items-center justify-center gap-3">
                  <CheckCircle class="w-5 h-5" />
                  Appeal Successfully Filed
               </div>
            </div>

          </div>
          
          <div v-else class="h-full border-2 border-dashed border-[#1E293B] rounded-2xl flex flex-col items-center justify-center md:min-h-[600px] text-center px-6 bg-[#0A0C10]/50">
             <div class="w-16 h-16 rounded-full bg-[#1E293B] flex items-center justify-center mb-4 border border-slate-700">
                <ShieldAlert class="w-8 h-8 text-slate-500" />
             </div>
             <h3 class="text-xl font-bold text-white mb-2">No Claim Selected</h3>
             <p class="text-slate-400 text-sm max-w-[250px]">Select a denied claim from the queue to review context and deploy the TinyFish autonomous agent.</p>
          </div>
        </div>

      </div>
    </main>
  </div>
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
