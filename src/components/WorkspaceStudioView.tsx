import React, { useState, useEffect } from "react";
import {
  Mail,
  FolderOpen,
  Calendar,
  Shield,
  Activity,
  Sparkles,
  RefreshCw,
  Plus,
  Trash,
  FileText,
  CheckCircle,
  AlertTriangle,
  Play,
  ArrowRight,
  ExternalLink,
  Lock,
  CloudLightning,
  UserCheck
} from "lucide-react";
import {
  RecruiterMessage,
  WorkspaceFile,
  CalendarEvent,
  PolicyViolation,
  PolicyEngine,
  GmailConnector,
  DriveConnector,
  CalendarConnector,
  LinkedInConnector,
  IndeedConnector,
  getCachedToken,
  setCachedToken,
  getGoogleClientId,
  saveGoogleClientId,
  startGoogleOAuthFlow
} from "../lib/workspaceConnectors";
import { JobMatch, Application } from "../types";

interface WorkspaceStudioViewProps {
  jobs: JobMatch[];
  applications: Application[];
  onTriggerApplicationTracking: (jobId: string) => void;
}

export default function WorkspaceStudioView({
  jobs,
  applications,
  onTriggerApplicationTracking
}: WorkspaceStudioViewProps) {
  // Connectors
  const gmail = new GmailConnector();
  const drive = new DriveConnector();
  const calendar = new CalendarConnector();
  const linkedin = new LinkedInConnector();
  const indeed = new IndeedConnector();

  // Selected sub-tab in workspace
  const [activeSubTab, setActiveSubTab] = useState<"connectors" | "inbox" | "drive" | "calendar" | "policy">("connectors");

  // Authentication State
  const [googleConnected, setGoogleConnected] = useState<boolean>(() => {
    return sessionStorage.getItem("jobclaw_google_oauth") === "true";
  });
  const [clientIdInput, setClientIdInput] = useState<string>(() => {
    return getGoogleClientId();
  });
  const [showClientIdConfig, setShowClientIdConfig] = useState<boolean>(false);

  const [linkedinConnected, setLinkedinConnected] = useState<boolean>(() => {
    return sessionStorage.getItem("jobclaw_linkedin_auth") === "true";
  });
  const [indeedConnected, setIndeedConnected] = useState<boolean>(() => {
    return sessionStorage.getItem("jobclaw_indeed_auth") === "true";
  });

  // State caches
  const [messages, setMessages] = useState<RecruiterMessage[]>([]);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [policyLevel, setPolicyLevel] = useState<"green" | "yellow" | "red">("yellow");
  const [violations, setViolations] = useState<PolicyViolation[]>([]);
  
  // Loading & interactive actions
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedMessage, setSelectedMessage] = useState<RecruiterMessage | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // New manual calendar event state
  const [showAddEvent, setShowAddEvent] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>("");
  const [newEventCompany, setNewEventCompany] = useState<string>("");
  const [newEventTime, setNewEventTime] = useState<string>("");
  const [newEventDesc, setNewEventDesc] = useState<string>("");
  const [newEventEmail, setNewEventEmail] = useState<string>("");

  // Assembly State (One-Click Application Package Mirroring to Drive)
  const [selectedAppForAssembly, setSelectedAppForAssembly] = useState<string>("");
  const [packageAssembled, setPackageAssembled] = useState<boolean>(false);
  const [assembling, setAssembling] = useState<boolean>(false);

  // Load all synced items
  const reloadData = async () => {
    setLoading(true);
    try {
      const msgs = await gmail.syncMessages();
      setMessages(msgs);

      const drvFiles = await drive.listArtifacts();
      setFiles(drvFiles);

      const calEvts = await calendar.syncEvents();
      setEvents(calEvts);

      setViolations(PolicyEngine.getViolations());
    } catch (e) {
      console.error("Workspace sync failure:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadData();
    PolicyEngine.setLevel(policyLevel);
  }, [policyLevel]);

  // Auth toggle simulations and real OAuth popup support
  const handleConnectGoogle = async () => {
    if (googleConnected) {
      if (window.confirm("Disconnect your Google Workspace account? Active background synchronization will pause.")) {
        setGoogleConnected(false);
        setCachedToken(null);
        sessionStorage.removeItem("jobclaw_google_oauth");
        setInfoMessage("Google Workspace integration disconnected.");
      }
    } else {
      if (clientIdInput.trim()) {
        setLoading(true);
        saveGoogleClientId(clientIdInput.trim());
        try {
          const token = await startGoogleOAuthFlow(clientIdInput.trim());
          if (token) {
            setGoogleConnected(true);
            sessionStorage.setItem("jobclaw_google_oauth", "true");
            setInfoMessage("Successfully connected with real Google account via OAuth! Initiating pipeline sync...");
            reloadData();
          }
        } catch (err: any) {
          window.alert(err.message || "Google Workspace authentication failed details.");
        } finally {
          setLoading(false);
        }
      } else {
        // Simulated sandbox mode
        setGoogleConnected(true);
        sessionStorage.setItem("jobclaw_google_oauth", "true");
        setInfoMessage("Google Workspace Connected in local Simulator Sandbox mode. To hook a live Google account, enter your Google Client ID below!");
        reloadData();
      }
    }
  };

  const handleConnectLinkedIn = () => {
    if (linkedinConnected) {
      setLinkedinConnected(false);
      sessionStorage.removeItem("jobclaw_linkedin_auth");
    } else {
      setLinkedinConnected(true);
      sessionStorage.setItem("jobclaw_linkedin_auth", "true");
    }
  };

  const handleConnectIndeed = () => {
    if (indeedConnected) {
      setIndeedConnected(false);
      sessionStorage.removeItem("jobclaw_indeed_auth");
    } else {
      setIndeedConnected(true);
      sessionStorage.setItem("jobclaw_indeed_auth", "true");
    }
  };

  // Gmail Quick Reply
  const handleSendReply = async (messageId: string) => {
    if (!replyText.trim()) return;
    setSendingReplyId(messageId);
    try {
      // GmailConnector has internal Policy evaluation for silent sending
      await gmail.sendReply(messageId, replyText);
      setInfoMessage("Email reply successfully sent! Handshake logged in pipeline audit trail.");
      setSelectedMessage(null);
      setReplyText("");
      reloadData();
    } catch (err: any) {
      // Alert of Policy restriction interception
      window.alert(err.message || "Failed to transmit message.");
      setViolations(PolicyEngine.getViolations());
    } finally {
      setSendingReplyId(null);
    }
  };

  // Dry Run Assembly Package (Storing structured dossier mirror in Drive folder system)
  const handleAssemblePackage = async () => {
    if (!selectedAppForAssembly) return;
    setAssembling(true);
    const app = applications.find(a => a.id === selectedAppForAssembly);
    if (!app) return;

    try {
      // Path layout: /Employment Agent/Applications/Company Name
      const folder = `/Employment Agent/Applications/${app.companyName}`;
      
      // Store cover letter artifact
      await drive.storeArtifact(
        `${app.companyName.replace(/\s+/g, "_")}_CoverPitch.md`,
        folder,
        app.coverLetter || "",
        "MD"
      );

      // Store resume summary matching variant index
      await drive.storeArtifact(
        `${app.companyName.replace(/\s+/g, "_")}_Aligned_Profile.pdf`,
        folder,
        `Master profile submitted to ${app.companyName}. Checked parameters passed.`,
        "PDF"
      );

      setPackageAssembled(true);
      setInfoMessage(`Dossier packages successfully mirrored to Google Drive: '${folder}/' folder initialized.`);
      reloadData();
    } catch (err: any) {
      window.alert(err.message || "Assembly interrupted by policy.");
      setViolations(PolicyEngine.getViolations());
    } finally {
      setAssembling(false);
    }
  };

  // Scheduler add custom interview block
  const handleAddCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventTime) return;

    try {
      await calendar.createEvent({
        title: newEventTitle,
        startTime: newEventTime,
        endTime: new Date(new Date(newEventTime).getTime() + 45 * 60000).toISOString(), // +45min default
        description: newEventDesc || "Scheduled recruiter briefing synced with desktop app.",
        location: "Video Link provided post-authentication",
        attendeeEmail: newEventEmail,
        company: newEventCompany
      });

      setNewEventTitle("");
      setNewEventCompany("");
      setNewEventTime("");
      setNewEventDesc("");
      setNewEventEmail("");
      setShowAddEvent(false);
      setInfoMessage("Unified Calendar interview slot registered! Intelligent prep kit initialized.");
      reloadData();
    } catch (err: any) {
      window.alert(err.message || "Calendar scheduling blocked by Policy Restrictor.");
      setViolations(PolicyEngine.getViolations());
    }
  };

  // Clean-up artifact files
  const handleDeleteDriveFile = async (fileId: string) => {
    if (!window.confirm("Verify: Are you sure you want to delete this file from Google Drive? This is an irreversible mutation.")) {
      return;
    }
    try {
      await drive.deleteArtifact(fileId);
      setInfoMessage("File removed from private Drive storage.");
      reloadData();
    } catch (err: any) {
      window.alert(err.message || "Deletion failed.");
      setViolations(PolicyEngine.getViolations());
    }
  };

  // Auto trigger calendar tracking from emails if matches known vacancy we have
  const handleAttachInboxToTracker = (msg: RecruiterMessage) => {
    // Search existing jobs to attach
    const matchingJob = jobs.find(j => j.company.toLowerCase().includes((msg.company || "").toLowerCase()));
    if (matchingJob) {
      onTriggerApplicationTracking(matchingJob.id);
      setInfoMessage(`Linked message threat from ${msg.company} into Core Applications active pipeline!`);
    } else {
      // Ingest vacancy directly
      const mockIngestedJobId = `job-pasted-${Date.now()}`;
      window.alert(`No exact shortlisted vacancy matches ${msg.company}. Routing to job seeker interface for custom insertion...`);
    }
  };

  return (
    <div id="workspace-studio-panel" className="space-y-6">
      
      {/* Banner Intro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CloudLightning className="h-5 w-5 text-blue-400" />
            <span>Workspace & Connector Studio</span>
          </h2>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Activate adapters, regulate background crawlers via Policy restrictions, mirror Drive archives, and monitor recruiter telemetry.
          </p>
        </div>

        {/* Sync Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={reloadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#222222] bg-[#111111] text-xs font-mono font-medium text-slate-300 hover:text-white transition-all hover:bg-[#1A1A1A] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${loading ? "animate-spin" : ""}`} />
            <span>Sync All Adapters</span>
          </button>
        </div>
      </div>

      {infoMessage && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 font-medium flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{infoMessage}</span>
          </div>
          <button onClick={() => setInfoMessage(null)} className="text-[10px] uppercase font-bold tracking-wider hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Sub-tab panels selection */}
      <div className="flex border-b border-[#222222] overflow-x-auto gap-2">
        <button
          onClick={() => setActiveSubTab("connectors")}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all ${
            activeSubTab === "connectors"
              ? "text-blue-400 border-blue-500"
              : "text-[#A1A1AA] border-transparent hover:text-white"
          }`}
        >
          1. API Connectors
        </button>
        <button
          onClick={() => setActiveSubTab("inbox")}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === "inbox"
              ? "text-blue-400 border-blue-500"
              : "text-[#A1A1AA] border-transparent hover:text-white"
          }`}
        >
          2. Smart Recruiter Inbox
          {messages.filter(m => m.status === "unread").length > 0 && (
            <span className="h-2 w-2 rounded-full bg-blue-500 " />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab("drive")}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all ${
            activeSubTab === "drive"
              ? "text-blue-400 border-blue-500"
              : "text-[#A1A1AA] border-transparent hover:text-white"
          }`}
        >
          3. Drive Dossier Assembly
        </button>
        <button
          onClick={() => setActiveSubTab("calendar")}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all ${
            activeSubTab === "calendar"
              ? "text-blue-400 border-blue-500"
              : "text-[#A1A1AA] border-transparent hover:text-white"
          }`}
        >
          4. Interview Scheduler
        </button>
        <button
          onClick={() => setActiveSubTab("policy")}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === "policy"
              ? "text-blue-400 border-blue-500"
              : "text-[#A1A1AA] border-transparent hover:text-white"
          }`}
        >
          5. Policy Guardrails
          {violations.length > 0 && (
            <span className="bg-amber-500/10 text-amber-400 text-[10px] px-1 rounded">
              {violations.length}
            </span>
          )}
        </button>
      </div>

      {/* VIEW DRAWERS */}

      {/* SUB TAB 1: API CONNECTORS */}
      {activeSubTab === "connectors" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-5">
            
            {/* Google Workspace Block */}
            <div className="p-5 rounded-xl border border-[#222222] bg-[#111111] space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Google Workspace integration</span>
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-500/5 border border-blue-400/25 px-1.5 py-0.5 rounded leading-none uppercase">
                      Least-Privilege Scopes
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-xl">
                    Allows JobClaw to securely check recruiter emails, synchronize scheduled interviews, and store CV assemblies inside a customized Drive folder directory without reading private communications.
                  </p>
                </div>
                <button
                  onClick={handleConnectGoogle}
                  className={`px-3 py-1.5 text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-all ${
                    googleConnected
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/35 hover:bg-emerald-500/20"
                      : "bg-blue-600 hover:bg-blue-500 text-white"
                  }`}
                >
                  {googleConnected ? "Authorized ✓" : "Activate OAuth"}
                </button>
              </div>

              {!googleConnected && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowClientIdConfig(!showClientIdConfig)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                  >
                    <span>{showClientIdConfig ? "Hide Real Integration Settings" : "Want to connect your real Google Workspace?"}</span>
                  </button>
                  
                  {showClientIdConfig && (
                    <div className="mt-2.5 p-3.5 bg-[#161616] border border-[#222222] rounded-lg space-y-2 text-xs">
                      <span className="font-bold text-slate-300 block font-mono text-[11px] uppercase">Link Google Web OAuth client credentials</span>
                      <p className="text-[11px] text-slate-405 leading-relaxed font-sans">
                        To load live data from your personal Gmail or Calendar, paste your OAuth Client ID here. Make sure your Google Console project OAuth consent screen is configured with scopes, and lists this exact URL under <strong className="text-slate-300">Authorized JavaScript origins</strong>:
                      </p>
                      <div className="p-2 bg-[#0C0C0C] rounded border border-[#222222] font-mono text-[10.5px] text-blue-300 select-all font-semibold">
                        {window.location.origin}
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. 123456-abcdefg.apps.googleusercontent.com"
                        value={clientIdInput}
                        onChange={(e) => setClientIdInput(e.target.value)}
                        className="w-full bg-[#0C0C0C] border border-[#222222] rounded p-2 font-mono text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {googleConnected && (
                <div className="pt-3 border-t border-[#222222] grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#1A1A1A] border border-[#262626] rounded-lg">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-semibold">Gmail Inbox</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[10px] font-mono text-[#71717A] mt-1 block">Scope: gmail.modify</span>
                  </div>
                  <div className="p-3 bg-[#1A1A1A] border border-[#262626] rounded-lg">
                    <div className="flex items-center justify-between text-xs text-slate-400 border-none">
                      <span className="font-semibold">Google Drive</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[10px] font-mono text-[#71717A] mt-1 block">Scope: drive.file</span>
                  </div>
                  <div className="p-3 bg-[#1A1A1A] border border-[#262626] rounded-lg">
                    <div className="flex items-center justify-between text-xs text-slate-300 border-none">
                      <span className="font-semibold">Google Calendar</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[10px] font-mono text-[#71717A] mt-1 block">Scope: calendar.events</span>
                  </div>
                </div>
              )}
            </div>

            {/* LinkedIn & Indeed Platform integrations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* LinkedIn block */}
              <div className="p-5 rounded-xl border border-[#222222] bg-[#111111] flex flex-col justify-between h-48">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-white tracking-tight">{linkedin.name}</span>
                    <span className={`text-[9px] font-mono font-black uppercase tracking-widest px-1 py-0.5 rounded leading-none ${
                      linkedinConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-[#1A1A1A] text-slate-500"
                    }`}>
                      {linkedinConnected ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    Import directly from LinkedIn recruiter outreach threads, and feed local vacancies securely.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConnectLinkedIn}
                  className="w-full text-center py-2 rounded-lg bg-[#1A1A1A] border border-[#262626] text-xs font-mono hover:text-white hover:bg-[#222222]"
                >
                  {linkedinConnected ? "Deauthorize Connector" : "Configure Partner Key"}
                </button>
              </div>

              {/* Indeed block */}
              <div className="p-5 rounded-xl border border-[#222222] bg-[#111111] flex flex-col justify-between h-48">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-white tracking-tight">{indeed.name}</span>
                    <span className={`text-[9px] font-mono font-black uppercase tracking-widest px-1 py-0.5 rounded leading-none ${
                      indeedConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-[#1A1A1A] text-slate-500"
                    }`}>
                      {indeedConnected ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    Connect through the Indeed Job Sync API. Pre-stage materials on targeted applicant-side forms safely.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConnectIndeed}
                  className="w-full text-center py-2 rounded-lg bg-[#1A1A1A] border border-[#262626] text-xs font-mono hover:text-white hover:bg-[#222222]"
                >
                  {indeedConnected ? "Deauthorize Connector" : "Configure Partner Key"}
                </button>
              </div>

            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            {/* Adapter Policy Alert card */}
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-slate-300 space-y-3">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Shield className="h-4 w-4" />
                <span>Adapter Architecture Security</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                In compliance with job boards Terms of Service, JobClaw strictly segregates capabilities from low-level providers. Our code relies on clean, decoupled client objects (<code className="text-blue-300">JobSource</code>, <code className="text-blue-300">DocumentStore</code>) ensuring API changes never impact core features.
              </p>
              <div className="p-2.5 bg-[#000000]/30 rounded border border-[#222222] font-mono text-[10px] space-y-1 text-[#A1A1AA]">
                <div className="flex justify-between">
                  <span>Policy restrictor:</span>
                  <span className="text-amber-400 uppercase font-black">{policyLevel} STATE</span>
                </div>
                <div className="flex justify-between">
                  <span>Silent automation:</span>
                  <span className="text-red-400">DISABLED ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 2: GMAIL SMART RECRUITER INBOX */}
      {activeSubTab === "inbox" && (
        <div className="space-y-4">
          {!googleConnected ? (
            <div className="p-8 text-center border border-dashed border-[#333333] rounded-xl space-y-3 bg-[#111111]/30">
              <Lock className="h-8 w-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">Gmail Connector Unauthorized</h3>
              <p className="text-xs text-[#71717A] max-w-sm mx-auto">
                Authorize Google Workspace scopes in the first tab to automatically query and parse live recruiter communications thread triggers.
              </p>
              <button
                onClick={() => setActiveSubTab("connectors")}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg mt-2"
              >
                Go to SDK Authorization
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Message threads list (Left) */}
              <div className="xl:col-span-5 space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-mono">
                  Gmail Telemetry Threads
                </h3>
                
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {messages.map(msg => (
                    <button
                      key={msg.id}
                      onClick={() => {
                        setSelectedMessage(msg);
                        setReplyText(msg.suggestedReply || "");
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                        selectedMessage?.id === msg.id
                          ? "bg-blue-600/10 border-blue-500 shadow-md"
                          : "bg-[#111111] border-[#222222] hover:border-[#333333]"
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-400 font-bold block">{msg.senderName}</span>
                        <span className="text-[#71717A] block">{new Date(msg.timestamp).toLocaleDateString()}</span>
                      </div>
                      <span className="text-xs font-bold text-white truncate block">{msg.subject}</span>
                      
                      <div className="flex justify-between items-center pt-2 mt-1 border-t border-[#222222]/50 text-[10px]">
                        <span className="text-slate-500 font-mono capitalize">Status: {msg.status}</span>
                        {msg.company && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/5 text-blue-400 border border-blue-400/15 font-mono">
                            {msg.company}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Thread reader & Suggested responder (Right) */}
              <div className="xl:col-span-7">
                {selectedMessage ? (
                  <div className="p-5 rounded-xl border border-[#222222] bg-[#111111] space-y-4">
                    
                    {/* Header info */}
                    <div className="flex justify-between items-start border-b border-[#222222] pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-tight">{selectedMessage.subject}</h4>
                        <span className="text-[11px] text-slate-400 mt-0.5 block font-mono">
                          From: {selectedMessage.senderName} ({selectedMessage.senderEmail})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Link to Application Tracker button */}
                        <button
                          onClick={() => handleAttachInboxToTracker(selectedMessage)}
                          className="px-2.5 py-1 text-[10px] font-bold tracking-wider font-mono uppercase bg-[#1A1A1A] text-slate-300 hover:text-white border border-[#262626] rounded-md transition-all flex items-center gap-1"
                        >
                          <Activity className="h-3 w-3 text-blue-400" />
                          <span>Link tracker</span>
                        </button>
                      </div>
                    </div>

                    {/* Email Body */}
                    <div className="bg-[#1A1A1A]/40 p-4 border border-[#222222] rounded-lg text-xs leading-relaxed text-slate-300 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                      {selectedMessage.body}
                    </div>

                    {/* AI Suggested Response Box */}
                    <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Intel Core Auto-Draft Response</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">Subject: Re: {selectedMessage.subject}</span>
                      </div>

                      <textarea
                        rows={7}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full bg-[#111111] border border-[#222222] rounded-md p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
                      />

                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          <span>Needs Human Audit Proceed</span>
                        </span>
                        
                        <button
                          onClick={() => handleSendReply(selectedMessage.id)}
                          disabled={sendingReplyId === selectedMessage.id}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg transition-all flex items-center gap-1 leading-none"
                        >
                          {sendingReplyId === selectedMessage.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          <span>Authorize Send</span>
                        </button>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="p-12 text-center border border-[#222222] rounded-xl bg-[#111111]/10 text-slate-500">
                    <Mail className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs">Select a parsed email thread on the left to review contents and prompt responses.</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* SUB TAB 3: DRIVE DOSSIER ASSEMBLY */}
      {activeSubTab === "drive" && (
        <div className="space-y-4">
          {!googleConnected ? (
            <div className="p-8 text-center border border-dashed border-[#333333] rounded-xl space-y-3 bg-[#111111]/30">
              <FolderOpen className="h-8 w-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">Google Drive Connector Unauthorized</h3>
              <p className="text-xs text-[#71717A] max-w-sm mx-auto">
                Connect external cloud storage in API Connectors to read and mirror local dossiers into custom workspace directories.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Manual Dossier Assemble Tool (Left config) */}
              <div className="xl:col-span-5 space-y-5">
                
                <div className="p-5 bg-[#111111] border border-[#222222] rounded-xl space-y-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-mono">
                    Structured Case Assembly
                  </h3>
                  
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Select an active shortlisted application to pack, archive, and mirror its customized cover pitch and tailored ATS resume into secure Drive sub-directories.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">Target Pipeline Role</span>
                      <select
                        value={selectedAppForAssembly}
                        onChange={(e) => {
                          setSelectedAppForAssembly(e.target.value);
                          setPackageAssembled(false);
                        }}
                        className="w-full bg-[#1A1A1A] border border-[#222222] text-xs text-white p-2 rounded-md mt-1"
                      >
                        <option value="">-- Choose active application --</option>
                        {applications.map(app => (
                          <option key={app.id} value={app.id}>
                            {app.companyName} - {app.jobTitle}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedAppForAssembly && (
                      <button
                        onClick={handleAssemblePackage}
                        disabled={assembling}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg transition-all flex justify-center items-center gap-1"
                      >
                        {assembling && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                        <span>Mirror Pack Assemblies</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Directory Mirroring Preview Scheme */}
                <div className="p-5 bg-[#111111] border border-[#222222] rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Cloud Directory Mirror scheme
                  </h4>
                  <div className="p-3 bg-[#1A1A1A]/30 rounded-lg border border-[#222222] font-mono text-[11px] text-[#A1A1AA] leading-relaxed space-y-2">
                    <div>
                      <span className="text-blue-400">/Employment Agent</span>
                      <p className="text-[10px] text-slate-500 pl-4">└ Root container repository</p>
                    </div>
                    <div>
                      <span className="text-blue-400 pl-4">/Resumes</span>
                      <p className="text-[10px] text-slate-500 pl-8">├ /ATS  -- Single-column extraction compatible</p>
                      <p className="text-[10px] text-slate-500 pl-8">└ /Visual -- Creative formatted styles</p>
                    </div>
                    <div>
                      <span className="text-blue-400 pl-4">/Applications</span>
                      <p className="text-[10px] text-slate-500 pl-8">└ /[Company Name] -- Anchored bespoke covers</p>
                    </div>
                    <div>
                      <span className="text-blue-400 pl-4">/Interviews</span>
                      <p className="text-[10px] text-slate-500 pl-8">└ Targeted tech briefs and prep kits</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Scraped Drive File Listings Archive (Right Table) */}
              <div className="xl:col-span-7 space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-mono">
                  Google Drive Cloud Files Ingested
                </h3>

                <div className="border border-[#222222] bg-[#111111] rounded-xl overflow-hidden">
                  <div className="p-3.5 bg-[#1A1A1A] border-b border-[#222222] grid grid-cols-12 text-[10px] font-mono uppercase tracking-wider font-black text-slate-400">
                    <span className="col-span-6 block">File Name</span>
                    <span className="col-span-4 block">Vibe Path</span>
                    <span className="col-span-2 block text-right">Actions</span>
                  </div>

                  <div className="divide-y divide-[#222222] max-h-[420px] overflow-y-auto">
                    {files.length === 0 ? (
                      <div className="p-10 text-center text-xs text-slate-500 font-mono">No files mirroring inside drive.</div>
                    ) : (
                      files.map(f => (
                        <div key={f.id} className="p-3.5 grid grid-cols-12 items-center text-xs hover:bg-[#1A1A1A] transition-all">
                          <div className="col-span-6 flex items-center gap-2 overflow-hidden pr-2">
                            <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                            <div>
                              <span className="text-white font-bold truncate block">{f.name}</span>
                              <span className="text-[10px] text-slate-500 block font-mono">{f.size} | {new Date(f.lastUpdated).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <span className="col-span-4 text-[10.5px] font-mono text-slate-400 truncate pr-2">
                            {f.path}
                          </span>

                          <div className="col-span-2 text-right">
                            <button
                              onClick={() => handleDeleteDriveFile(f.id)}
                              className="p-1.5 hover:bg-red-500/10 hover:text-red-400 text-slate-500 rounded transition-all"
                              title="Delete File"
                            >
                              <Trash className="h-3.5 w-3.5 mx-auto" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      )}

      {/* SUB TAB 4: CALENDAR INTERVIEW SCHEDULER */}
      {activeSubTab === "calendar" && (
        <div className="space-y-4">
          {!googleConnected ? (
            <div className="p-8 text-center border border-dashed border-[#333333] rounded-xl space-y-3 bg-[#111111]/30">
              <Calendar className="h-8 w-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">Google Calendar Connected Required</h3>
              <p className="text-xs text-[#71717A] max-w-sm mx-auto">
                Authenticate your Workspace Google login to automatically synchronize recruiter interview dates with core system prep kits.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Event Schedule List & AI prep details */}
              <div className="xl:col-span-7 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-mono">
                    Synchronized Interview events
                  </h3>
                  <button
                    onClick={() => setShowAddEvent(!showAddEvent)}
                    className="px-2.5 py-1 text-[10.5px] font-mono font-bold tracking-widest uppercase bg-blue-600 hover:bg-blue-500 text-white rounded transition-all flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Create Session</span>
                  </button>
                </div>

                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                  {events.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-500 font-mono border border-dashed border-[#222222] rounded-xl">
                      No matching interview blocks registered on connected Google Calendars.
                    </div>
                  ) : (
                    events.map(evt => (
                      <div key={evt.id} className="p-5 bg-[#111111] border border-[#222222] rounded-xl space-y-4">
                        
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-black block">Google Calendar Event</span>
                            <h4 className="text-sm font-bold text-white mt-1 leading-snug">{evt.title}</h4>
                            <div className="flex flex-wrap items-baseline gap-x-2 mt-1.5 text-[11px] text-slate-400">
                              <span className="font-semibold text-blue-405">{evt.company || "General Partner"}</span>
                              <span className="text-[#71717A]">|</span>
                              <span className="font-mono">{new Date(evt.startTime).toLocaleString()}</span>
                            </div>
                          </div>

                          <span className="px-1.5 py-0.5 rounded uppercase font-bold text-[9px] font-mono bg-emerald-400/10 text-emerald-400">
                            Prep Kit: READY
                          </span>
                        </div>

                        <p className="text-xs text-slate-350 bg-[#1A1A1A]/40 p-3 rounded border border-[#222222] leading-relaxed">
                          {evt.description}
                        </p>

                        {/* Staged Recruiter Intelligent prep items */}
                        <div className="space-y-2 border-t border-[#222222]/80 pt-3">
                          <span className="text-[10px] font-mono text-[#71717A] uppercase tracking-widest block">Intel Core Prep Checklist</span>
                          <ul className="space-y-1.5 text-xs">
                            {evt.prepActionItems.map((item, id) => (
                              <li key={id} className="flex gap-2 items-start text-slate-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                <span className="leading-relaxed font-sans">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add event modal layout */}
              <div className="xl:col-span-5">
                {showAddEvent ? (
                  <form onSubmit={handleAddCalendarEvent} className="p-5 bg-[#111111] border border-[#222222] rounded-xl space-y-4">
                    <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-widest font-mono border-b border-[#222222] pb-2">
                      New Interview Session Slot
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span>1. Session Briefing Title</span>
                        <input
                          type="text"
                          required
                          placeholder="e.g., Stripe Frontend Coding Stage"
                          value={newEventTitle}
                          onChange={(e) => setNewEventTitle(e.target.value)}
                          className="w-full bg-[#1A1A1A] border border-[#222222] rounded p-2 text-white mt-1 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span>2. Company</span>
                          <input
                            type="text"
                            placeholder="e.g., Stripe"
                            value={newEventCompany}
                            onChange={(e) => setNewEventCompany(e.target.value)}
                            className="w-full bg-[#1A1A1A] border border-[#222222] rounded p-2 text-white mt-1 focus:outline-none"
                          />
                        </div>
                        <div>
                          <span>3. Recruiter Email</span>
                          <input
                            type="email"
                            placeholder="sarah@stripe.com"
                            value={newEventEmail}
                            onChange={(e) => setNewEventEmail(e.target.value)}
                            className="w-full bg-[#1A1A1A] border border-[#222222] rounded p-2 text-white mt-1 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <span>4. Date & Start Time (CST/Austin)</span>
                        <input
                          type="datetime-local"
                          required
                          value={newEventTime}
                          onChange={(e) => setNewEventTime(e.target.value)}
                          className="w-full bg-[#1A1A1A] border border-[#222222] text-xs font-mono text-white p-2 rounded mt-1 focus:outline-none"
                        />
                      </div>

                      <div>
                        <span>5. Scope / Description Notes</span>
                        <textarea
                          rows={3}
                          placeholder="What did the recruiter outline? (e.g. AWS performance pipelines optimization, concurrency structures, React 19)"
                          value={newEventDesc}
                          onChange={(e) => setNewEventDesc(e.target.value)}
                          className="w-full bg-[#1A1A1A] border border-[#222222] rounded p-2 text-white mt-1 focus:outline-none placeholder-slate-650"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold font-mono uppercase tracking-widest text-white rounded transition-all mt-2"
                      >
                        Push Event & Propose Prep Kit
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-5 bg-[#111111] border border-[#222222] rounded-xl text-center text-xs text-[#71717A] space-y-2">
                    <Sparkles className="h-6 w-6 text-blue-500/80 mx-auto" />
                    <strong className="text-white block">Event Enrichment Engine</strong>
                    <p className="leading-relaxed">
                      All new scheduled calendar sessions automatically queries our core AI engine to construct dedicated preparatory checklists.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* SUB TAB 5: POLICY ENGINE GUARDRAILS */}
      {activeSubTab === "policy" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Policy controls (Left) */}
          <div className="lg:col-span-6 space-y-5">
            <div className="p-5 bg-[#111111] border border-[#222222] rounded-xl space-y-4">
              <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-widest font-mono border-b border-[#222222] pb-2">
                Compliance Level Regulators
              </h3>

              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Configure your API Automation Policy. By restricting headless commands and preventing blind auto-applies, JobClaw secures your recruiter score and ensures perfect TOS compliance.
              </p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPolicyLevel("green")}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col gap-1 items-center ${
                    policyLevel === "green"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                      : "bg-[#1A1A1A]/40 border-[#222222] hover:border-[#333333] text-slate-500"
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span className="text-xs font-bold leading-none mt-1">Green</span>
                  <span className="text-[9px] font-mono opacity-80 leading-none uppercase">Permissive</span>
                </button>

                <button
                  onClick={() => setPolicyLevel("yellow")}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col gap-1 items-center ${
                    policyLevel === "yellow"
                      ? "bg-amber-500/10 border-amber-500 text-amber-500"
                      : "bg-[#1A1A1A]/40 border-[#222222] hover:border-[#333333] text-slate-500"
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span className="text-xs font-bold leading-none mt-1">Yellow</span>
                  <span className="text-[9px] font-mono opacity-80 leading-none uppercase">Moderate</span>
                </button>

                <button
                  onClick={() => setPolicyLevel("red")}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col gap-1 items-center ${
                    policyLevel === "red"
                      ? "bg-red-500/10 border-red-500 text-red-405"
                      : "bg-[#1A1A1A]/40 border-[#222222] hover:border-[#333333] text-slate-500"
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  <span className="text-xs font-bold leading-none mt-1">Red</span>
                  <span className="text-[9px] font-mono opacity-80 leading-none uppercase">Restrictive</span>
                </button>
              </div>

              {/* Engine Status Parameters */}
              <div className="p-4 bg-[#1A1A1A]/50 rounded-lg border border-[#222222] space-y-2 text-xs">
                <span className="font-bold text-white block uppercase text-[10px] tracking-wider font-mono">Regulator Parameter checks</span>
                <div className="flex justify-between items-center">
                  <span className="text-slate-450">Block Mass head-less Apply:</span>
                  <span className={`font-mono text-[10px] font-bold ${policyLevel !== "green" ? "text-emerald-400" : "text-amber-500"}`}>
                    {policyLevel !== "green" ? "ENFORCED (YES)" : "PAUSED (NO)"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-450">Human Verification Step:</span>
                  <span className={`font-mono text-[10px] font-bold ${policyLevel !== "green" ? "text-emerald-400" : "text-amber-500"}`}>
                    {policyLevel !== "green" ? "MANDATORY (YES)" : "PAUSED (NO)"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-450">Silent E-mail Dispatching:</span>
                  <span className="font-mono text-[10px] font-bold text-emerald-400">
                    BLOCKED INSTANTLY ✓
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Real-time intercepted Log Traces */}
          <div className="lg:col-span-6 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-blue-405 animate-pulse" />
              <span>Telemetry Intercepted Violations</span>
            </h3>

            <div className="border border-[#222222] bg-[#111111] rounded-xl divide-y divide-[#222222] max-h-[380px] overflow-y-auto">
              {violations.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 font-mono">
                  No policy infractions or intercepted silent actions caught. Clean system record.
                </div>
              ) : (
                violations.map(v => (
                  <div key={v.id} className="p-4 space-y-1.5">
                    <div className="flex justify-between items-start text-[10px] font-mono">
                      <span className="text-red-400 font-bold uppercase tracking-wider bg-red-500/5 px-1 rounded border border-red-500/10">
                        {v.severity}
                      </span>
                      <span className="text-[#71717A]">{new Date(v.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <strong className="text-white text-xs block font-mono">{v.connectorName} -- {v.action}</strong>
                    <p className="text-[11px] text-slate-400 leading-snug">{v.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
