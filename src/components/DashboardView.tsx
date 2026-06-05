
import React from 'react';
import { Briefcase, FileText, CheckCircle, TrendingUp } from 'lucide-react';
import { Profile, JobMatch, Application, AuditMessage } from '../types';

interface DashboardViewProps {
  profile: Profile;
  jobs: JobMatch[];
  applications: Application[];
  audits: AuditMessage[];
  setActiveTab: (tab: string) => void;
  onSelectJob: (job: JobMatch) => void;
  geminiConnected: boolean;
}

const DashboardView: React.FC<DashboardViewProps> = ({ jobs, applications, audits, geminiConnected }) => {
  return (
    <div id="dashboard-view" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        {geminiConnected && <span className="text-xs text-emerald-400 font-mono">Gemini Connected</span>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-[#222222] p-4 rounded-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase">Jobs Found</h3>
          <p className="text-2xl font-bold text-white">{jobs.length}</p>
        </div>
        <div className="bg-[#111111] border border-[#222222] p-4 rounded-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase">Applications</h3>
          <p className="text-2xl font-bold text-white">{applications.length}</p>
        </div>
        <div className="bg-[#111111] border border-[#222222] p-4 rounded-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase">Audits</h3>
          <p className="text-2xl font-bold text-white">{audits.length}</p>
        </div>
        <div className="bg-[#111111] border border-[#222222] p-4 rounded-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase">Status</h3>
          <p className="text-2xl font-bold text-emerald-400">Active</p>
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
