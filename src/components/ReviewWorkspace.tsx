import React from "react";
import DashboardView from "./DashboardView";
import CareerVaultView from "./components/CareerVaultView";
import JobsView from "./components/JobsView";
import ApplicationsView from "./components/ApplicationsView";

interface ReviewWorkspaceProps {
  profile: any;
  jobs: any[];
  applications: any[];
  audits: any[];
  geminiConnected: boolean | null;
  setActiveWorkspace: (workspace: string) => void;
  onUpdateProfile: (updated: any) => void;
  onSelectJob: (job: any) => void;
  onIngestJob: (jobData: Record<string, unknown>) => void;
  onTriggerApplicationTracking: (jobId: string) => void;
  onUpdateApplicationStatus: (id: string, status: string, policyStatus?: string, notes?: string) => void;
  onUpdateApplicationDocs: (id: string, coverLetter: string, outreachNotes: string) => void;
}

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
  return (
    <div className="space-y-8">
      <DashboardView
        profile={profile}
        jobs={jobs}
        applications={applications}
        audits={audits}
        setActiveTab={(tab: string) => {
          // Map tabs to workspaces
          if (tab === "autopilot") {
            setActiveWorkspace("resolve");
          } else {
            setActiveWorkspace("review");
          }
        }}
        onSelectJob={onSelectJob}
        geminiConnected={geminiConnected}
      />
      
      <CareerVaultView
        profile={profile}
        onUpdateProfile={onUpdateProfile}
        geminiConnected={geminiConnected}
      />
      
      <JobsView
        jobs={jobs}
        profile={profile}
        onSelectJob={onSelectJob}
        onIngestJob={onIngestJob}
        onTriggerApplicationTracking={onTriggerApplicationTracking}
      />
      
      <ApplicationsView
        applications={applications}
        onUpdateApplicationStatus={onUpdateApplicationStatus}
        onUpdateApplicationDocs={onUpdateApplicationDocs}
      />
    </div>
  );
};

export default ReviewWorkspace;