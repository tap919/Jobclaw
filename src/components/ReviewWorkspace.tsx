import React from "react";
import {
  Profile,
  JobMatch,
  Application,
  AuditMessage,
  SectorPack,
  Experience,
  BulletPoint,
  GapExplanation,
  Education
} from "../types";
import ResumeStudioView from "./ResumeStudioView";
import SectorPacksView from "./SectorPacksView";
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
  sectorPacks: SectorPack[];
  selectedJobForTailoring: JobMatch | null;
  geminiConnected: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setActiveWorkspace: (workspace: string) => void;
  onUpdateProfile: (updated: Profile) => void;
  onSelectJob: (job: JobMatch) => void;
  onIngestJob: (jobData: Partial<JobMatch>) => Promise<unknown>;
  onTriggerApplicationTracking: (jobId: string) => void;
  onUpdateApplicationStatus: (id: string, status: string, policyStatus?: string, notes?: string) => void;
  onUpdateApplicationDocs: (id: string, coverLetter: string, outreachNotes: string) => void;
}

import DashboardView from "./DashboardView";
import CareerVaultView from "./CareerVaultView";
import JobsView from "./JobsView";
import ApplicationsView from "./ApplicationsView";

// --- Consolidated ReviewWorkspace Component ---
const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({
  profile,
  jobs,
  applications,
  audits,
  sectorPacks,
  selectedJobForTailoring,
  geminiConnected,
  activeTab,
  setActiveTab,
  setActiveWorkspace,
  onUpdateProfile,
  onSelectJob,
  onIngestJob,
  onTriggerApplicationTracking,
  onUpdateApplicationStatus,
  onUpdateApplicationDocs
}) => {

  return (
    <div className="space-y-8">
      {/* Navigation tabs or logic to switch between consolidated views */}
      <div className="flex gap-4 border-b border-[#222222] pb-4">
        <button onClick={() => setActiveTab("dashboard")}>Dashboard</button>
        <button onClick={() => setActiveTab("jobs")}>Jobs</button>
        <button onClick={() => setActiveTab("applications")}>Applications</button>
        <button onClick={() => setActiveTab("vault")}>Vault</button>
        <button onClick={() => setActiveTab("studio")}>Studio</button>
        <button onClick={() => setActiveTab("sectors")}>Sectors</button>
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
      {activeTab === "studio" && (
        <ResumeStudioView
          profile={profile}
          jobs={jobs}
          selectedJobForTailoring={selectedJobForTailoring}
          geminiConnected={geminiConnected}
          onUpdateProfile={onUpdateProfile}
        />
      )}
      {activeTab === "sectors" && (
        <SectorPacksView packs={sectorPacks} />
      )}
    </div>
  );
};

export default ReviewWorkspace;
