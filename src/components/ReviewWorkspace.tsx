import React, { useState } from "react";
import {
  Profile,
  JobMatch,
  Application,
  AuditMessage,
  Experience,
  BulletPoint,
  GapExplanation,
  Education
} from "../types";
import {
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Clock,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Activity,
  Play,
  Search,
  Plus,
  Compass,
  MapPin,
  Calendar,
  Sparkles,
  Cpu,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  FileCheck,
  Layers,
  ClipboardList,
  Mail,
  Edit,
  Bookmark,
  ChevronDown,
  Info,
  Trash2,
  Edit3,
  Check,
  Award,
  BookOpen,
  Link2,
  Users,
  CheckSquare
} from "lucide-react";

// --- Consolidated Types & Interfaces ---
interface ReviewWorkspaceProps {
  profile: Profile;
  jobs: JobMatch[];
  applications: Application[];
  audits: AuditMessage[];
  geminiConnected: boolean | null;
  setActiveWorkspace: (workspace: string) => void;
  onUpdateProfile: (updated: Profile) => void;
  onSelectJob: (job: JobMatch) => void;
  onIngestJob: (jobData: any) => Promise<any>;
  onTriggerApplicationTracking: (jobId: string) => void;
  onUpdateApplicationStatus: (id: string, status: any, policyStatus?: any, notes?: string) => void;
  onUpdateApplicationDocs: (id: string, coverLetter: string, outreachNotes: string) => void;
}

// --- Consolidated ReviewWorkspace Component ---
const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({
  profile,
  jobs,
  applications,
  audits,
  geminiConnected,
  setActiveWorkspace,
  onUpdateProfile,
  onSelectJob,
  onIngestJob,
  onTriggerApplicationTracking,
  onUpdateApplicationStatus,
  onUpdateApplicationDocs
}) => {
  const [activeTab, setActiveTab] = useState<"dashboard" | "vault" | "jobs" | "applications" | "settings">("dashboard");

  return (
    <div className="space-y-8">
      {/* Navigation tabs or logic to switch between consolidated views */}
      <div className="flex gap-4 border-b border-[#222222] pb-4">
        <button onClick={() => setActiveTab("dashboard")}>Dashboard</button>
        <button onClick={() => setActiveTab("jobs")}>Jobs</button>
        <button onClick={() => setActiveTab("applications")}>Applications</button>
        <button onClick={() => setActiveTab("vault")}>Vault</button>
      </div>

      {activeTab === "dashboard" && (
        <DashboardView
          profile={profile}
          jobs={jobs}
          applications={applications}
          audits={audits}
          setActiveTab={setActiveTab}
          onSelectJob={onSelectJob}
          geminiConnected={geminiConnected}
        />
      )}
      {activeTab === "vault" && (
        <CareerVaultView
          profile={profile}
          onUpdateProfile={onUpdateProfile}
          geminiConnected={geminiConnected}
        />
      )}
      {activeTab === "jobs" && (
        <JobsView
          jobs={jobs}
          profile={profile}
          onSelectJob={onSelectJob}
          onIngestJob={onIngestJob}
          onTriggerApplicationTracking={onTriggerApplicationTracking}
        />
      )}
      {activeTab === "applications" && (
        <ApplicationsView
          applications={applications}
          onUpdateApplicationStatus={onUpdateApplicationStatus}
          onUpdateApplicationDocs={onUpdateApplicationDocs}
        />
      )}
    </div>
  );
};

// --- Inlined Components ---

// DashboardView (Content from DashboardView.tsx)
const DashboardView = ({ profile, jobs, applications, audits, setActiveTab, onSelectJob, geminiConnected }: any) => {
    // ... [Content of DashboardView.tsx, with minor adjustments if necessary]
    return <div id="dashboard-view" className="space-y-6">Dashboard placeholder</div>; // Placeholder
}

// JobsView (Content from JobsView.tsx)
const JobsView = ({ jobs, profile, onSelectJob, onIngestJob, onTriggerApplicationTracking }: any) => {
    // ... [Content of JobsView.tsx, with minor adjustments if necessary]
    return <div id="jobs-workspace-view" className="space-y-6">Jobs placeholder</div>; // Placeholder
}

// ApplicationsView (Content from ApplicationsView.tsx)
const ApplicationsView = ({ applications, onUpdateApplicationStatus, onUpdateApplicationDocs }: any) => {
    // ... [Content of ApplicationsView.tsx, with minor adjustments if necessary]
    return <div id="applications-board-view" className="space-y-6">Applications placeholder</div>; // Placeholder
}

// CareerVaultView (Content from CareerVaultView.tsx)
const CareerVaultView = ({ profile, onUpdateProfile, geminiConnected }: any) => {
    // ... [Content of CareerVaultView.tsx, with minor adjustments if necessary]
    return <div id="career-vault-view" className="space-y-6">Vault placeholder</div>; // Placeholder
}

export default ReviewWorkspace;
