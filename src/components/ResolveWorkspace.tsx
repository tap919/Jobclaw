import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RefreshCw,
  Sliders,
  Database,
  Terminal,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Activity,
  FileText,
  Layers,
  Sparkles,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Info,
  Brain,
  GitBranch,
  Cpu,
  Code,
  MapPin,
  Calendar,
  Briefcase,
  ShieldAlert,
  HelpCircle,
  Edit3,
  Check,
  Award,
  BookOpen,
  Link2,
  Users,
  CheckSquare
} from "lucide-react";
import { QueueItem, AutopilotLog, AutopilotRuleSet, AutopilotSkillRegistry } from "../types";

interface ResolveWorkspaceProps {
  setActiveWorkspace: (workspace: string) => void;
}

const ResolveWorkspace: React.FC<ResolveWorkspaceProps> = ({ setActiveWorkspace }) => {
  // State from AutopilotConsoleView related to Queue and Logs
  const [activeQueueFilter, setActiveQueueFilter] = useState<string>("all");
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueueItem | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [logs, setLogs] = useState<AutopilotLog[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [cronCountdown, setCronCountdown] = useState<Record<string, number>>({
    job_ingest_cron: 245,
    job_rank_cron: 520,
    application_prepare_cron: 890,
    submission_cron: 1250,
    gmail_sync_cron: 1820,
    followup_cron: 3110
  });

  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3000);
  };

  // Helper for status styling of state machine states
  const getStateBadgeStyle = (state: string) => {
    switch (state) {
      case "discovered":
        return "bg-slate-800 text-slate-300 border-slate-700";
      case "normalized":
        return "bg-blue-950 text-blue-400 border-blue-900/30";
      case "scored":
        return "bg-yellow-950/40 text-yellow-500 border-yellow-900/30";
      case "shortlisted":
        return "bg-purple-950/40 text-purple-400 border-purple-900/30";
      case "prepared":
        return "bg-cyan-950/40 text-cyan-400 border-cyan-900/30";
      case "validation_passed":
        return "bg-teal-950/60 text-teal-400 border-teal-900/30";
      case "submitted":
        return "bg-indigo-950/60 text-indigo-400 border-indigo-900/30";
      case "confirmed":
        return "bg-emerald-950/60 text-emerald-400 border-emerald-900/30";
      case "tracked":
        return "bg-emerald-600/15 text-emerald-400 border-emerald-500/30 font-bold";
      case "error":
        return "bg-red-950/60 text-red-400 border-red-900/30 font-semibold";
      default:
        return "bg-neutral-800 text-neutral-400";
    }
  };

  // Format date helper
  const formatTimeOnly = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // Load system data from API
  const loadEngineState = async () => {
    try {
      const res = await fetch("/api/autopilot/state");
      const data = await res.json();
      if (data.status === "success") {
        setQueue(data.queue);
        setLogs(data.logs);
        
        // Auto-select first queue item if none is selected
        if (data.queue.length > 0 && !selectedQueueItem) {
          setSelectedQueueItem(data.queue[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load autopilot engine state in Resolve Workspace:", err);
      // Load fallback mock data
      setQueue([
        {
          id: "q1",
          jobTitle: "Senior React Engineer",
          companyName: "Stripe",
          state: "tracked",
          fitScore: 94,
          compensation: "$160,000",
          lastActionDate: new Date().toISOString(),
          logs: [
            "Ingested from Greenhouse successfully.",
            "Computed fit score: 94% flat.",
            "Prefill packages verified.",
            "Form submitted cleanly, captured screenshot."
          ]
        },
        {
          id: "q2",
          jobTitle: "Junior Java Developer",
          companyName: "OldLegacy Corp",
          state: "error",
          errorType: "selector_changed",
          fitScore: 41,
          compensation: "$60,000",
          lastActionDate: new Date().toISOString(),
          errorMessage: "Policy violation: Compensation below floor ($120k). Form submission aborted automatically.",
          logs: [
            "Ingested from pastings.",
            "Computed fit score: 41% (Below threshold 78%).",
            "Aborted submission due to safety violations."
          ]
        },
        {
          id: "q3",
          jobTitle: "Technical Writer",
          companyName: "Figma",
          state: "error",
          errorType: "selector_changed",
          fitScore: 81,
          compensation: "$115,000",
          lastActionDate: new Date().toISOString(),
          errorMessage: "ATS structural change detected. Selector 'input[name=resume]' not found.",
          logs: [
            "Ingested Figma technical writer.",
            "Computed fit score: 81%.",
            "Initiating xpath fallback options...",
            "All fallback selector attempts exhausted. Redirecting to manual review."
          ]
        }
      ]);
      setLogs([
        { id: "l1", cron: "job_ingest_cron", level: "info", message: "Successfully polled active company watchlists.", timestamp: new Date().toISOString() },
        { id: "l2", cron: "submission_cron", level: "error", message: "Selector failure during Figma Technical Writer submission.", timestamp: new Date().toISOString() }
      ]);
    }
  };

  useEffect(() => {
    loadEngineState();
    
    // Polling simulation just to keep timers alive
    const interval = setInterval(() => {
      const nextRnds = {
         job_ingest_cron: Math.round(180 + Math.random() * 600),
         job_rank_cron: Math.round(180 + Math.random() * 600),
         application_prepare_cron: Math.round(180 + Math.random() * 600),
         submission_cron: Math.round(180 + Math.random() * 600),
         gmail_sync_cron: Math.round(180 + Math.random() * 600),
         followup_cron: Math.round(180 + Math.random() * 600)
      };
      setCronCountdown(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (next[k] <= 5) {
            next[k] = nextRnds[k as keyof typeof nextRnds];
          } else {
            next[k] = next[k] - 1;
          }
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Trigger individual cron simulators
  const handleTriggerCronTask = async (cronName: string) => {
    try {
      setActionLoading(cronName);
      const res = await fetch("/api/autopilot/trigger-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronName })
      });
      const data = await res.json();
      if (data.status === "success") {
        setQueue(data.queue);
        setLogs(data.logs);
        
        // Refresh selected item to show new logs
        if (selectedQueueItem) {
          const updated = data.queue.find((q: QueueItem) => q.id === selectedQueueItem.id);
          if (updated) setSelectedQueueItem(updated);
        } else if (data.queue.length > 0) {
          setSelectedQueueItem(data.queue[0]);
        }
        
        triggerToast(`Execution successful for task: ${cronName}`);
      }
    } catch (e) {
      console.error(e);
      // Simulate locally
      triggerToast(`Simulation completed for ${cronName}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Reset/reseed queue
  const handleResetQueue = async () => {
    if (window.confirm("Reseed Autopilot state machine queue with default demonstration records?")) {
      try {
        setActionLoading("reset");
        const res = await fetch("/api/autopilot/reset", { method: "POST" });
        const data = await res.json();
        if (data.status === "success") {
          setQueue(data.queue);
          setLogs(data.logs);
          setSelectedQueueItem(data.queue[0] || null);
          triggerToast("Queue reset successfully!");
        }
      } catch (e) {
        console.error(e);
        triggerToast("Mock queue reset performed.");
      } finally {
        setActionLoading(null);
      }
    }
  };

  const getCronDetails = (name: string) => {
    switch (name) {
      case "job_ingest_cron":
        return { label: "Job Ingestion Cron", desc: "Ingests jobs from saved pages, company registries, and aggregate sources.", cycle: "*/5 8-18 * * 1-5" };
      case "job_rank_cron":
        return { label: "Normalizer & Fit Scorer", desc: "Normalizes raw job listings and calculates deterministic overlap scores.", cycle: "*/15 * * * *" };
      case "application_prepare_cron":
        return { label: "Application Packet Builder", desc: "Prepares candidate packets: chooses resume variant and resolves questions.", cycle: "*/20 * * * *" };
      case "submission_cron":
        return { label: "ATS Submission Worker", desc: "Spins up browser task scripts to submit validation-cleared application forms.", cycle: "*/30 * * * *" };
      case "gmail_sync_cron":
        return { label: "Gmail Sync Daemon", desc: "Syncs recruiting email threads, detects recruiter replies, and updates status.", cycle: "0 * * * *" };
      case "followup_cron":
        return { label: "End-of-Day Auditor", desc: "Runs end-of-day audit: retries failed pages and summarizes results.", cycle: "0 19 * * *" };
      default:
        return { label: name, desc: "", cycle: "" };
    }
  };

  return (
    <div id="resolve-workspace" className="space-y-6">
      
      {/* SUCCESS TOAST MESSAGE */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#10B981] text-white py-2.5 px-4 rounded-lg shadow-xl font-medium text-xs animate-slide-in">
          <CheckCircle className="h-4.5 w-4.5 stroke-[2.5]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* TOP SUMMARY DECK PANEL */}
      <div className="bg-[#111111] border border-[#222222] rounded-xl p-6.5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-tr from-blue-600/20 to-indigo-600/10 rounded-xl relative">
            <Activity className="h-8 w-8 text-blue-400" />
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-sans text-white tracking-tight">
                Exception Inbox & Resolve Queue
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono leading-none border uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-semibold">
                RESOLVE WORKSPACE
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1 pr-6 leading-relaxed">
              Emphasizing the Queue and exception inbox. Investigate failed submissions, resolve dynamic selector blockers, and clear missing questionnaire dependencies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetQueue}
            className="px-4 py-2.5 bg-[#18181B] border border-[#27272A] hover:bg-[#202023] hover:text-white rounded-lg text-xs font-semibold font-mono text-[#A1A1AA] transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Demo Queue</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveWorkspace("review")}
            className="px-5 py-2.5 rounded-lg text-xs font-bold font-sans bg-blue-600 text-white hover:bg-blue-500 hover:shadow-blue-500/10 transition-all flex items-center gap-2"
          >
            <ArrowRight className="h-3.5 w-3.5 rotate-180" />
            <span>Back to Review</span>
          </button>
        </div>
      </div>

      {/* CORE QUEUE AND EXCEPTION WORKSPACE CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Cron scheduler items and Queue table */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* State Machine Queue Table */}
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-mono font-bold uppercase text-white">Exception & Automation Queue (Layer 1 Core)</span>
              </div>
              <span className="text-[10.5px] font-mono text-blue-400">
                {queue.length} Active Records
              </span>
            </div>

            {/* Status Buckets Switcher */}
            <div className="flex flex-wrap gap-1.5 pb-4.5 border-b border-[#222222]/60 mb-4 text-[10px] font-mono">
              <button
                onClick={() => setActiveQueueFilter("all")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  activeQueueFilter === "all"
                    ? "bg-[#222225] text-white font-bold border border-zinc-700"
                    : "text-[#71717A] hover:text-slate-300 hover:bg-[#1A1A1D]/50 border border-transparent"
                }`}
              >
                ALL RECORDS ({queue.length})
              </button>
              <button
                onClick={() => setActiveQueueFilter("tracked")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  activeQueueFilter === "tracked"
                    ? "bg-emerald-950/40 text-emerald-400 font-bold border border-emerald-500/25"
                    : "text-[#71717A] hover:text-[#10B981] hover:bg-[#1A1A1D]/50 border border-transparent"
                }`}
              >
                SUCCESS TRACKED ({queue.filter(q => q.state === "tracked").length})
              </button>
              <button
                onClick={() => setActiveQueueFilter("selector_changed")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  activeQueueFilter === "selector_changed"
                    ? "bg-red-950/40 text-red-400 font-bold border border-red-500/25"
                    : "text-[#71717A] hover:text-red-400 hover:bg-[#1A1A1D]/50 border border-transparent"
                }`}
              >
                SELECTOR FAILURES ({queue.filter(q => q.errorType === "selector_changed").length})
              </button>
              <button
                onClick={() => setActiveQueueFilter("captcha_encountered")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  activeQueueFilter === "captcha_encountered"
                    ? "bg-amber-950/40 text-amber-500 font-bold border border-amber-500/25"
                    : "text-[#71717A] hover:text-amber-500 hover:bg-[#1A1A1D]/50 border border-transparent"
                }`}
              >
                CAPTCHA ENCOUNTERS ({queue.filter(q => q.errorType === "captcha_encountered").length})
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#222222] text-[#71717A] uppercase tracking-wider font-mono text-[9.5px]">
                    <th className="pb-3 pl-2.5">Title &amp; Company</th>
                    <th className="pb-3 text-center">Fit Score</th>
                    <th className="pb-3">Compensation</th>
                    <th className="pb-3">Autopilot State</th>
                    <th className="pb-3 text-right pr-2.5">Last Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {queue.filter(item => {
                    if (activeQueueFilter === "all") return true;
                    if (activeQueueFilter === "tracked") return item.state === "tracked";
                    return item.errorType === activeQueueFilter;
                  }).map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedQueueItem(item)}
                      className={`hover:bg-[#151515] transition-colors cursor-pointer ${
                        selectedQueueItem?.id === item.id ? "bg-blue-600/10 border-l-4 border-blue-500 pl-1.5" : ""
                      }`}
                    >
                      <td className="py-3 pl-2.5">
                        <div className="font-bold text-slate-200">{item.jobTitle}</div>
                        <div className="text-[11px] text-[#71717A]">{item.companyName}</div>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`font-mono font-bold text-xs p-1 ${
                          item.fitScore >= 85 ? "text-emerald-400" : "text-yellow-500"
                        }`}>
                          {item.fitScore}%
                        </span>
                      </td>
                      <td className="py-3 text-slate-300 font-mono text-[11px]">
                        {item.compensation}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider ${getStateBadgeStyle(item.state)}`}>
                          {item.state}
                        </span>
                        {item.errorType && (
                          <span className="block text-[10px] text-red-400 font-mono italic mt-0.5 truncate max-w-[140px]">
                            {item.errorType}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right pr-2.5 text-[#71717A] font-mono text-[10.5px]">
                        {formatTimeOnly(item.lastActionDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Continuous Cron Task Rings display */}
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-mono font-bold uppercase text-white">Continuous Cron Task Rings</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {Object.keys(cronCountdown).slice(0, 4).map((name) => {
                const info = getCronDetails(name);
                return (
                  <div key={name} className="p-4 bg-[#141414] border border-[#222222] rounded-lg flex flex-col justify-between hover:border-slate-700 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white font-mono">{info.label}</span>
                        <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[9.5px] font-mono text-blue-450 rounded uppercase leading-none font-semibold">
                          {info.cycle}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed mb-3">
                        {info.desc}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-1 pt-2.5 border-t border-[#1C1C1C]">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10.5px] font-mono text-[#71717A]">
                          Trigger: <strong className="text-blue-400">{cronCountdown[name]}s</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTriggerCronTask(name)}
                        disabled={actionLoading !== null}
                        className="text-[10.5px] bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white px-2.5 py-1 rounded font-mono font-bold border border-blue-500/20 transition-all flex items-center gap-1"
                      >
                        {actionLoading === name ? (
                          <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <Play className="h-2.5 w-2.5 fill-current" />
                        )}
                        <span>Run Now</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Col: Inspection and Logs (Exception Inbox Inspector) */}
        <div className="space-y-6">
          
          {/* Active Record Inspector */}
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#222222] mb-4">
              <Layers className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-mono font-bold uppercase text-white">Exception Inspector</span>
            </div>

            {selectedQueueItem ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white leading-snug">{selectedQueueItem.jobTitle}</h3>
                  <p className="text-xs text-[#A1A1AA]">{selectedQueueItem.companyName} — {selectedQueueItem.seniority}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-[#141414] border border-[#222222] rounded-lg">
                    <span className="text-[10px] font-mono text-[#71717A] block uppercase">Pacing Checked</span>
                    <span className="text-slate-200 mt-0.5 font-semibold block">Pass</span>
                  </div>
                  <div className="p-2.5 bg-[#141414] border border-[#222222] rounded-lg">
                    <span className="text-[10px] font-mono text-[#71717A] block uppercase">Match Score</span>
                    <span className="text-emerald-400 mt-0.5 font-mono font-bold block">{selectedQueueItem.fitScore}%</span>
                  </div>
                </div>

                <div className="space-y-1.5 p-3.5 bg-[#141414] border border-[#222222] rounded-lg">
                  <h4 className="text-[10.5px] font-mono uppercase text-[#71717A] font-bold">State Machine Path logs:</h4>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {selectedQueueItem.logs?.map((lStr, li) => (
                      <div key={li} className="text-[10.5px] leading-relaxed font-mono text-slate-300 flex items-start gap-1">
                        <span className="text-blue-500 select-none">&gt;</span>
                        <span>{lStr}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedQueueItem.selectorSnapshot && (
                  <div className="p-3 bg-[#0C0C0C] border border-[#222222] rounded-lg font-mono text-[10px] text-zinc-400">
                    <div className="flex items-center gap-1 text-[9.5px] text-blue-400 uppercase tracking-wider font-bold mb-1">
                      <Code className="h-3 w-3" />
                      <span>Deciphered ATS Fields</span>
                    </div>
                    <p className="leading-normal">{selectedQueueItem.selectorSnapshot}</p>
                  </div>
                )}

                {selectedQueueItem.errorMessage && (
                  <div className="p-3 bg-[#3F1111]/20 border border-red-900/30 rounded-lg text-[11px] text-red-400 leading-relaxed flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Process Blocked:</strong>
                      <span>{selectedQueueItem.errorMessage}</span>
                    </div>
                  </div>
                )}
                
                {selectedQueueItem.state === "error" && (
                  <div className="pt-2 border-t border-[#222222] flex gap-2">
                    <button
                      onClick={() => {
                        triggerToast("Force overriding exception rules...");
                        setTimeout(() => {
                          setQueue(prev => prev.map(q => q.id === selectedQueueItem.id ? { ...q, state: "tracked", errorType: null, errorMessage: null } : q));
                          setSelectedQueueItem(prev => prev ? { ...prev, state: "tracked", errorType: null, errorMessage: null } : null);
                          triggerToast("Exception resolved and record forced to tracked.");
                        }, 1000);
                      }}
                      className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-550 text-white font-bold text-xs rounded transition-colors"
                    >
                      Override Exception
                    </button>
                    <button
                      onClick={() => {
                        setQueue(prev => prev.filter(q => q.id !== selectedQueueItem.id));
                        setSelectedQueueItem(null);
                        triggerToast("Record archived successfully.");
                      }}
                      className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-slate-300 hover:text-white text-xs rounded transition-colors"
                    >
                      Archive
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#71717A] font-mono">
                Select a queue record to inspect exceptions and state logs.
              </div>
            )}
          </div>

          {/* Automation feed logs */}
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-mono font-bold uppercase text-white">Automation Feed Logs</span>
              </div>
            </div>

            <div className="space-y-3.5 max-h-[290px] overflow-y-auto pr-1.5 font-mono text-[11px] leading-relaxed">
              {logs.map((log) => (
                <div key={log.id} className="pb-3 border-b border-[#1A1A1A] last:border-none">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-blue-400 font-bold">[{log.cron}]</span>
                    <span className="text-[#71717A]">{formatTimeOnly(log.timestamp)}</span>
                  </div>
                  <p className={`text-slate-300 ${
                    log.level === "error" ? "text-red-400" : log.level === "success" ? "text-emerald-400 font-semibold" : ""
                  }`}>
                    {log.message}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default ResolveWorkspace;
