
import React from 'react';
import { JobMatch, Profile } from '../types';

interface JobsViewProps {
  jobs: JobMatch[];
  profile: Profile;
  onSelectJob: (job: JobMatch) => void;
  onIngestJob: (job: Partial<JobMatch>) => Promise<unknown>;
  onTriggerApplicationTracking: (jobId: string) => void;
}

const JobsView: React.FC<JobsViewProps> = ({ jobs }) => {
  return (
    <div id="jobs-workspace-view" className="space-y-6">
      <h2 className="text-xl font-bold text-white">Jobs</h2>
      <div className="bg-[#111111] border border-[#222222] p-4 rounded-lg">
        <p className="text-sm text-slate-400">Total Jobs: {jobs.length}</p>
      </div>
    </div>
  );
}

export default JobsView;
