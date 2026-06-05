import React from "react";
import { AnalyticsStats } from "../types";
import { TrendingUp, BarChart3, Star, Award, Zap, ArrowUpRight } from "lucide-react";

export default function AnalyticsView() {
  // Configured mockup data benchmarks for high-fidelity conversion charts
  const conversionStats = {
    applied: 52,
    screened: 18,
    interviewed: 8,
    offers: 3,
  };

  const responseRate = 34.6; // overall % callback
  const interviewRate = 44.4; // callback to interview %
  const offerRate = 37.5; // interview to offer %

  const sourceChartData = [
    { source: "Board Connectors Feed", volume: 24, rate: 37.5 },
    { source: "Direct RSS Alerts API", volume: 18, rate: 44.4 },
    { source: "User Pasted Manual URLs", volume: 10, rate: 20.0 }
  ];

  const topBulletPerformers = [
    {
      text: "Architected a real-time event ingestion engine in Node.js, increasing daily ingestion throughput from 2M to 15M records.",
      sector: "Enterprise SaaS & Telemetry",
      rate: 88,
    },
    {
      text: "Migrated infrastructure configurations from manual EC2 instances to AWS ECS Docker tasks, achieving an annual cloud spending savings of $120,000.",
      sector: "Cloud Infrastructure",
      rate: 79,
    }
  ];

  return (
    <div id="analytics-workspace-panel" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          <span>Local Campaign Analytics</span>
        </h2>
        <p className="text-xs text-[#A1A1AA] mt-1">
          Measure which bullet structures and sector narratives correlate with interviews, and trace source yield privately on your system.
        </p>
      </div>

      {/* Main Aggregates Upper Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Radial Callback Progress Arc */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-widest font-mono">Overall Callback yield</h3>
            <span className="text-[10px] text-slate-500 font-sans block mt-0.5">Application-to-response rate</span>
            
            <div className="flex justify-center my-6 relative items-center">
              {/* Custom SVG gauge arc */}
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-[#222222] fill-transparent stroke-[10]"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-blue-400 fill-transparent stroke-[10]"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - responseRate / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-2xl font-mono font-bold text-white">{responseRate}%</span>
                <span className="text-[9px] text-slate-500 block uppercase font-mono font-bold">Callback Rate</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-[#1A1A1A]/25 p-2 rounded border border-[#222222] flex items-center gap-1.5 justify-center leading-none">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            <span>Overarching yield beats global market standard by 14%</span>
          </div>
        </div>

        {/* Custom SVG conversion funnel list */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 space-y-3.5">
          <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-widest font-mono">Conversion Funnel Stages</h3>
          <span className="text-[10px] text-slate-500 block mt-0.5 leading-none">Yield from original listing to offer</span>

          <div className="space-y-2 pt-1 font-mono text-[10px]">
            {/* Applied funnel segment */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>1. Applied Submissions</span>
                <strong className="text-white">{conversionStats.applied}</strong>
              </div>
              <div className="h-3.5 bg-[#1A1A1A] rounded-md overflow-hidden p-0.5 border border-[#222222]">
                <div className="h-full bg-blue-600/80 rounded-sm w-full" />
              </div>
            </div>

            {/* Screened funnel segment */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>2. Recruiter Screens</span>
                <strong className="text-white">{conversionStats.screened}</strong>
              </div>
              <div className="h-3.5 bg-[#1A1A1A] rounded-md overflow-hidden p-0.5 border border-[#222222]">
                <div
                  className="h-full bg-blue-600/60 rounded-sm"
                  style={{ width: `${(conversionStats.screened / conversionStats.applied) * 100}%` }}
                />
              </div>
            </div>

            {/* Interviewed funnel segment */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>3. Systems Coding Labs</span>
                <strong className="text-white">{conversionStats.interviewed}</strong>
              </div>
              <div className="h-3.5 bg-[#1A1A1A] rounded-md overflow-hidden p-0.5 border border-[#222222]">
                <div
                  className="h-full bg-blue-600/40 rounded-sm"
                  style={{ width: `${(conversionStats.interviewed / conversionStats.applied) * 100}%` }}
                />
              </div>
            </div>

            {/* Offers funnel segment */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400 font-bold">
                <span className="text-emerald-400">4. Proposals Issued</span>
                <strong className="text-emerald-400">{conversionStats.offers}</strong>
              </div>
              <div className="h-3.5 bg-[#1A1A1A] rounded-md overflow-hidden p-0.5 border border-[#222222]">
                <div
                  className="h-full bg-emerald-400/80 rounded-sm"
                  style={{ width: `${(conversionStats.offers / conversionStats.applied) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Source Yield Comparison statistics */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-widest font-mono">Source performance</h3>
          <span className="text-[10px] text-slate-500 block leading-none">Comparing channel callback frequencies</span>

          <div className="space-y-3 pt-1">
            {sourceChartData.map((src, id) => (
              <div
                key={id}
                className="p-2.5 rounded-lg bg-[#1A1A1A] border border-[#222222] flex justify-between items-center text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-350 block leading-tight">{src.source}</span>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{src.volume} roles matched</span>
                </div>
                <div className="text-right">
                  <span className="text-blue-400 font-mono font-bold block">{src.rate}%</span>
                  <span className="text-[10px] text-slate-500 block">callback</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bullet performance correlation table widget representation */}
      <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-widest font-mono">High-yield bullet correlates</h3>
          <span className="text-[10px] text-slate-500 block mt-0.5">Traceable achievements performing best during ATS parsing and recruiter reviews</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topBulletPerformers.map((bul, id) => (
            <div
              key={id}
              className="p-3.5 bg-[#1A1A1A] border border-[#222222] rounded-xl space-y-3 relative overflow-hidden"
            >
              {/* Star badge decorative */}
              <div className="absolute top-2 right-2 text-yellow-400/80">
                <Zap className="h-4.5 w-4.5 fill-yellow-400/10 stroke-[2]" />
              </div>

              <div className="space-y-1 pr-4">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">{bul.sector}</span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{bul.text}</p>
              </div>

              <div className="flex justify-between text-[11px] items-baseline pt-2 border-t border-[#222222]">
                <span className="text-slate-550">Correlated callback confidence:</span>
                <strong className="text-blue-400 font-mono">{bul.rate}% score</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
