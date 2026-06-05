import React from "react";
import {
  Briefcase,
  FileText,
  Layers,
  Search,
  CheckSquare,
  BarChart3,
  Sliders,
  Database,
  Grid2X2,
  Cpu,
  User,
  ShieldAlert,
  CloudLightning
} from "lucide-react";

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  geminiConnected: boolean | null;
  profileName: string;
  onNavigate?: (workspace: string, tab: string) => void;
}

export default function Navigation({
  activeTab,
  setActiveTab,
  geminiConnected,
  profileName,
  onNavigate
}: NavigationProps) {
  const navGroups = [
    {
      title: "Review",
      items: [
        { id: "dashboard", label: "Dashboard", icon: Grid2X2 },
        { id: "vault", label: "Career Vault", icon: Database },
        { id: "jobs", label: "Jobs", icon: Search },
        { id: "applications", label: "Applications", icon: CheckSquare }
      ]
    },
    {
      title: "Automate",
      items: [
        { id: "studio", label: "Resume Studio", icon: FileText },
        { id: "sectors", label: "Sector Packs", icon: Layers }
      ]
    },
    {
      title: "Resolve",
      items: [
        { id: "autopilot", label: "Autopilot Console", icon: Cpu }
      ]
    },
    {
      title: "Admin",
      items: [
        { id: "workspace", label: "Workspace Studio", icon: CloudLightning },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
        { id: "settings", label: "Settings", icon: Sliders }
      ]
    }
  ];

  return (
    <aside
      id="jobclaw-sidebar"
      className="w-64 bg-[#111111] border-r border-[#222222] flex flex-col h-full text-[#EDEDED]"
    >
      {/* Brand Header */}
      <div className="p-6 border-b border-[#222222] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Briefcase className="h-5 w-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-sans text-white tracking-tight flex items-center gap-1">
              Job<span className="text-blue-500">Claw</span>
            </h1>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717A]">
              Desktop Workspace
            </span>
          </div>
        </div>
      </div>

      {/* Nav Link Items */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <React.Fragment key={gi}>
            <div className="px-3 pt-4 pb-1 text-xs font-medium text-[#4B4B4B] uppercase tracking-wider">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => {
                        const workspaceMap: Record<string, string> = {
                          Review: "review",
                          Automate: "review",
                          Resolve: "resolve",
                          Admin: "admin"
                        };
                        const ws = workspaceMap[group.title] || "review";
                        if (onNavigate) {
                          onNavigate(ws, item.id);
                        } else {
                          setActiveTab(item.id);
                        }
                      }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 pl-2 shadow-inner"
                        : "hover:bg-[#1A1A1A] hover:text-white border-l-4 border-transparent pl-3 text-[#A1A1AA]"
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-[#71717A]'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </React.Fragment>
        ))}
      </nav>

      {/* Connection and Profile state Footer */}
      <div className="p-4 border-t border-[#222222] bg-[#0F0F0F] text-xs">
        {/* Gemini API state indicator */}
        <div className="flex items-center justify-between mb-3 px-2 py-2 rounded-md bg-[#1A1A1A] border border-[#262626]">
          <div className="flex items-center gap-2 text-[#A1A1AA] font-medium">
            <Cpu className="h-3.5 w-3.5 text-blue-400" />
            <span>Gemini Intel Core</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                geminiConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"
              }`}
            />
            <span className="text-[10px] font-mono text-[#A1A1AA]">
              {geminiConnected ? "LIVE" : "DEMO"}
            </span>
          </div>
        </div>

        {/* User Context Avatar */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="h-8 w-8 rounded-full bg-[#1A1A1A] flex items-center justify-center border border-[#262626]">
            <User className="h-4 w-4 text-[#A1A1AA]" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">{profileName}</p>
            <p className="text-[10px] text-[#71717A] truncate">Austin, Austin-TX</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
