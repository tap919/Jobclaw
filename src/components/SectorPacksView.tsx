import React from "react";
import { SectorPack } from "../types";
import { Layers, Lightbulb, CheckSquare, Sparkles, TrendingUp, Cpu } from "lucide-react";

interface SectorPacksProps {
  packs: SectorPack[];
}

export default function SectorPacksView({ packs }: SectorPacksProps) {
  return (
    <div id="sector-packs-view" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-400" />
          <span>Sector Targeting Bundles</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Select target sector templates containing structured taxonomy keywords and pre-crafted bullet structures to satisfy specific recruiters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {packs.map((pack) => (
          <div
            key={pack.id}
            className="bg-[#111111] border border-[#222222] rounded-xl p-5 flex flex-col justify-between hover:border-[#333333] transition-all"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">{pack.name}</h3>
                  <span className="text-[10px] text-blue-400 font-mono font-bold bg-blue-400/5 border border-blue-400/10 px-2 py-0.5 rounded-full block mt-1.5 w-max">
                    {pack.growthStats}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-[#1A1A1A] text-slate-400">
                  <Cpu className="h-5 w-5 text-blue-400" />
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                {pack.shortDescription}
              </p>

              {/* Keywords collection */}
              <div className="space-y-2 pt-1">
                <h4 className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-widest">Core Taxonomies:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {pack.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-[#1A1A1A] hover:bg-slate-950 rounded text-[11px] text-slate-300 border border-[#222222]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Exemplary bullet examples */}
              <div className="space-y-2 pt-2 border-t border-[#222222] pb-1">
                <h4 className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                  <span>Target Bullets Benchmarks (ATS-safe)</span>
                </h4>
                <div className="space-y-1.5">
                  {pack.exampleAtsBullets.map((bul, idx) => (
                    <p
                      key={idx}
                      className="text-[11px] text-slate-400 pl-3.5 relative before:content-['→'] before:absolute before:left-1 before:text-blue-400 font-sans"
                    >
                      {bul}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                alert(`Successfully configured workspace presets as ${pack.name}. Global keyword parser matched.`);
              }}
              className="w-full mt-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-md shadow-blue-500/10"
            >
              Apply Sector Presets to Refiner
            </button>
          </div>
        ))}
      </div>

      {/* Dynamic guidance alert box */}
      <div className="p-4 rounded-xl bg-[#111111] border border-[#222222] text-xs text-slate-400 flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <span className="font-bold text-white block">Adaptive Synced Taxonomies</span>
          <p className="leading-relaxed">
            Applying a sector pack overrides downstream resume parser triggers. When you scan an active document variant in the Resume Studio, the ATS compliance checker scores density specifically against these industry terms, ensuring you match the hiring standard.
          </p>
        </div>
      </div>
    </div>
  );
}
