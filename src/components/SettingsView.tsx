import React from "react";
import { Sliders, Cpu, ShieldAlert, CheckCircle, Flame, ExternalLink } from "lucide-react";

interface SettingsProps {
  geminiConnected: boolean | null;
}

export default function SettingsView({ geminiConnected }: SettingsProps) {
  return (
    <div id="settings-view-workspace" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sliders className="h-5 w-5 text-blue-400" />
          <span>System Settings & Policy Guardrails</span>
        </h2>
        <p className="text-xs text-[#A1A1AA] mt-1">
          Configure automation policies, browser assistance configurations, and monitor full-stack Gemini system credentials safely.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Automation policy toggles */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest font-mono border-b border-[#222222] pb-2">
            Workspace Automation Policy Engine
          </h3>
          <p className="text-xs text-slate-450 font-sans leading-relaxed">
            In compliance with job platforms' terms of service, JobClaw implements strict automation guardrails. Uncontrolled mass auto-apply is blocked to prevent account bans or platform security flags.
          </p>

          <div className="space-y-3 pt-1 text-xs text-slate-350">
            {/* Green toggles */}
            <div className="p-3.5 bg-emerald-500/5 rounded-lg border border-emerald-500/10 space-y-2">
              <div className="flex justify-between items-center text-emerald-400 font-bold uppercase text-[10px] tracking-widest font-mono">
                <span>Green Level: Ingestion & Tailor</span>
                <span className="bg-emerald-400/10 px-1.5 rounded text-[9px] font-bold">PERMITTED</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">Allows non-invasive operations such as parsing, drafting, keyword mapping, analytics, and notification scheduling.</p>
            </div>

            {/* Yellow toggles */}
            <div className="p-3.5 bg-amber-500/5 rounded-lg border border-amber-500/10 space-y-2">
              <div className="flex justify-between items-center text-amber-400 font-bold uppercase text-[10px] tracking-widest font-mono">
                <span>Yellow Level: Browser-Assisted Autofills</span>
                <span className="bg-amber-400/10 px-1.5 rounded text-[9px] font-bold">RESTRICTED TRIGGER</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">Pre-stages candidate pack details inside a browser assistant overlays, demanding final user physical confirmation click.</p>
            </div>

            {/* Red toggles */}
            <div className="p-3.5 bg-red-400/5 rounded-lg border border-red-500/10 space-y-2 text-red-300">
              <div className="flex justify-between items-center font-bold uppercase text-[10px] tracking-widest font-mono text-red-400">
                <span>Red Level: Blind Mass Submissions</span>
                <span className="bg-red-500/10 px-1.5 rounded text-[9px] font-bold text-red-400">BLOCKED INSTANTLY</span>
              </div>
              <p className="text-[11px] text-slate-450 leading-snug font-sans">Disables headless headless form filling, bypass tools, or scraping operations. Requires human verification step for compliance stability.</p>
            </div>
          </div>
        </div>

        {/* Gemini Service dashboard monitor */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 space-y-5">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-widest font-mono border-b border-[#222222] pb-2 flex items-center gap-1.5">
              <Cpu className="h-4.5 w-4.5 text-blue-400" />
              <span>Gemini Intel Core Diagnostics</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#1A1A1A] rounded-lg border border-[#222222]">
                <span className="text-[10px] text-slate-500 font-mono block uppercase">Active Model</span>
                <span className="text-white font-bold block mt-1">gemini-3.5-flash</span>
              </div>

              <div className="p-3 bg-[#1A1A1A] rounded-lg border border-[#222222]">
                <span className="text-[10px] text-slate-500 font-mono block uppercase">SDK Version</span>
                <span className="text-white font-mono block mt-1">@google/genai ^2.4</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#1A1A1A] flex justify-between items-center border border-[#222222] text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-300 block">Server-Side Secret Key Status:</span>
                <span className="text-slate-500 font-mono block text-[10.5px]">Accessed via process.env.GEMINI_API_KEY</span>
              </div>
              
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-400/5 border border-blue-400/15">
                <span className={`h-2.5 w-2.5 rounded-full ${geminiConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                <span className="text-[10px] font-mono tracking-widest font-bold text-blue-400">
                  {geminiConnected ? "ACTIVE" : "FALLBACK"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-blue-400/10 bg-blue-500/5 text-xs text-slate-450 space-y-2">
            <span className="font-bold text-white block">Key Security & Credentials</span>
            <p className="leading-relaxed font-sans text-slate-450">
              The JobClaw development architecture operates using proxy endpoints. Your secret keys are hidden server-side, preventing leakage into front-end browser builds. 
            </p>
            <p className="text-[11px] leading-relaxed select-text mt-1 text-blue-400">
              To update credentials, navigate to the **Settings &gt; Secrets** panel in Google AI Studio. It is then dynamically bound automatically!
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
