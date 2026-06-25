import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Profile, JobMatch, Application, AuditMessage, SectorPack } from "./types";
import Navigation from "./components/Navigation";
import AdminWorkspace from "./components/AdminWorkspace";
import ReviewWorkspace from "./components/ReviewWorkspace";
import ResolveWorkspace from "./components/ResolveWorkspace";

class ErrorBoundary extends React.Component<{ children: ReactNode }> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-slate-400 gap-4 p-8">
          <div className="bg-red-950/30 text-red-400 border border-red-900/50 p-6 rounded-lg max-w-2xl font-mono text-sm shadow-xl">
            <h2 className="text-white text-lg mb-2 flex items-center gap-2">⚠️ Application Error Detected</h2>
            <p className="mb-4 text-red-300/80">The workspace encountered an unexpected fault.</p>
            <pre className="bg-[#050505] p-4 rounded overflow-x-auto text-[11px] whitespace-pre-wrap word-break">
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-[#222222] hover:bg-[#333333] text-white rounded transition-colors"
            >
              Reload Workspace Session
            </button>
          </div>
        </div>
      );
    }
    return (this as React.Component<{ children: ReactNode }>).props.children;
  }
}

export default function App() {
  const [activeWorkspace, setActiveWorkspace] = useState<string>("review");
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [geminiConnected, setGeminiConnected] = useState<boolean>(false);

  const handleNavigate = (workspace: string, tab: string) => {
    setActiveWorkspace(workspace);
    setCurrentTab(tab);
  };

  // States
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [audits, setAudits] = useState<AuditMessage[]>([]);
  const [sectorPacks, setSectorPacks] = useState<SectorPack[]>([]);
  
  // Job reference selected for quick tailoring redirect
  const [chosenTailorJob, setChosenTailorJob] = useState<JobMatch | null>(null);

  // Load all initial workspace context from express full-stack endpoints
  const fetchAllData = async () => {
    try {
      // 1. Get profile
      const profRes = await fetch("/api/profile");
      const profData = await profRes.json();
      if (profData.status === "success") {
        setProfile(profData.profile);
        
        // Audit profile
        const auditRes = await fetch("/api/gemini/audit-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: profData.profile })
        });
        const auditData = await auditRes.json();
        if (auditData.status === "success") {
          setAudits(auditData.audits);
          // Set live gemini status
          setGeminiConnected(!auditData.isMocked);
        }
      }

      // 2. Get jobs pool
      const jobsRes = await fetch("/api/jobs");
      const jobsData = await jobsRes.json();
      if (jobsData.status === "success") {
        setJobs(jobsData.jobs);
      }

      // 3. Get applications tracking list
      const appRes = await fetch("/api/applications");
      const appData = await appRes.json();
      if (appData.status === "success") {
        setApplications(appData.applications);
      }

      // 4. Get sector intelligence packs
      const sectorRes = await fetch("/api/sector-packs");
      const sectorData = await sectorRes.json();
      if (sectorData.status === "success") {
        setSectorPacks(sectorData.sectorPacks);
      }
    } catch (err) {
      console.error("Workspace initial synchronization error:", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Update profile handler details
  const handleUpdateProfile = async (updated: Profile) => {
    setProfile(updated);
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      // Trigger a re-audit matching new profile details immediately
      const auditRes = await fetch("/api/gemini/audit-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: updated })
      });
      const auditData = await auditRes.json();
      if (auditData.status === "success") {
        setAudits(auditData.audits);
      }
    } catch (err) {
      console.error("Error committing profile update", err);
    }
  };

  // Ingest custom pasted vacancies
  const handleIngestJob = async (jobData: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData)
      });
      const data = await response.json();
      if (data.status === "success") {
        setJobs(prev => [data.job, ...prev]);
        return data.job;
      }
    } catch (err) {
      console.error("Error creating ingested job", err);
    }
  };

  // Create campaign pitch application tracker from job Match ID
  const handleTriggerApplicationTracking = async (jobId: string) => {
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, status: "Shortlisted", approvalPolicyStatus: "Draft" })
      });
      const data = await response.json();
      if (data.status === "success") {
        // Refresh application state
        const appRes = await fetch("/api/applications");
        const appData = await appRes.json();
        if (appData.status === "success") {
          setApplications(appData.applications);
        }
        setActiveWorkspace("review"); // Navigate to review workspace to show applications
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update application Kanban transitions
  const handleUpdateApplicationStatus = async (id: string, status: string, policyStatus?: string, notes?: string) => {
    try {
      await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, approvalPolicyStatus: policyStatus, notes })
      });
      const appRes = await fetch("/api/applications");
      const appData = await appRes.json();
      if (appData.status === "success") {
        setApplications(appData.applications);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update cover pitch letter documents text inline
  const handleUpdateApplicationDocs = async (id: string, coverLetter: string, outreachNotes: string) => {
    try {
      const targetApp = applications.find(a => a.id === id);
      if (!targetApp) return;
      await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverLetter, outreachNotes, approvalPolicyStatus: "Ready for Review" })
      });
      const appRes = await fetch("/api/applications");
      const appData = await appRes.json();
      if (appData.status === "success") {
        setApplications(appData.applications);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!profile) {
    return (
      <div id="loader-fallback" className="h-screen w-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-slate-400 gap-4">
        <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
        <span className="font-mono text-xs text-[#A1A1AA]">Synchronizing JobClaw Full-Stack Environment...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div id="jobclaw-application" className="flex h-screen w-screen bg-[#0A0A0A] overflow-hidden font-sans text-slate-300">
        {/* SIDEBAR NAVIGATION GRID */}
        <Navigation
          activeTab={activeWorkspace}
          setActiveTab={setActiveWorkspace}
          onNavigate={handleNavigate}
          geminiConnected={geminiConnected}
          profileName={profile.contactInfo.fullName}
        />

        {/* MAIN SCREEN DOCK */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0A0A0A]">
          {/* Upper Desk Panel status elements */}
          <header className="px-8 py-4.5 border-b border-[#222222] flex items-center justify-between shrink-0 bg-[#0A0A0A]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <h2 className="text-white text-xs font-mono font-bold uppercase tracking-wider">
                Desk Workspace -- Texas Core Engine v1.0.4
              </h2>
            </div>
            
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-500 font-mono text-[11px]">User TAP919BEATS Verified</span>
              <span className="text-slate-600">|</span>
              <div className="px-2.5 py-1 rounded bg-[#111111] border border-[#222222] text-[10.5px] font-semibold text-slate-400">
                TX/AUSTIN CENTRAL TIME
              </div>
            </div>
          </header>

          {/* Content canvas with scroll margins */}
          <div className="flex-1 p-8 overflow-y-auto block">
            {activeWorkspace === "review" && (
              <ReviewWorkspace
                profile={profile}
                jobs={jobs}
                applications={applications}
                audits={audits}
                sectorPacks={sectorPacks}
                selectedJobForTailoring={chosenTailorJob}
                geminiConnected={geminiConnected}
                activeTab={currentTab}
                setActiveTab={setCurrentTab}
                setActiveWorkspace={setActiveWorkspace}
                onUpdateProfile={handleUpdateProfile}
                onSelectJob={setChosenTailorJob}
                onIngestJob={handleIngestJob}
                onTriggerApplicationTracking={handleTriggerApplicationTracking}
                onUpdateApplicationStatus={handleUpdateApplicationStatus}
                onUpdateApplicationDocs={handleUpdateApplicationDocs}
              />
            )}
            
            {activeWorkspace === "resolve" && (
              <ResolveWorkspace setActiveWorkspace={setActiveWorkspace} />
            )}
            
            {activeWorkspace === "admin" && (
              <AdminWorkspace />
            )}
          </div>

          {/* Outer bottom bezel */}
          <footer className="px-8 py-3 bg-[#0A0A0A] border-t border-[#222222] flex items-center justify-between text-[10px] text-slate-500 shrink-0 font-mono">
            <span>Austin Developer Sandbox Security Mode ACTIVE</span>
            <span>© 2026 JobClaw Inc. All rights reserved.</span>
          </footer>
        </main>
      </div>
    </ErrorBoundary>
  );
}