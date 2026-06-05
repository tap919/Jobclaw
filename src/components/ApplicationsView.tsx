
import React from 'react';
import { Application } from '../types';

interface ApplicationsViewProps {
  applications: Application[];
  onUpdateApplicationStatus: (id: string, status: string, policyStatus?: string, notes?: string) => void;
  onUpdateApplicationDocs: (id: string, field: string, value: string) => void;
}

const ApplicationsView: React.FC<ApplicationsViewProps> = ({ applications }) => {
  return (
    <div id="applications-board-view" className="space-y-6">
      <h2 className="text-xl font-bold text-white">Applications</h2>
      <div className="bg-[#111111] border border-[#222222] p-4 rounded-lg">
        <p className="text-sm text-slate-400">Total Applications: {applications.length}</p>
      </div>
    </div>
  );
}

export default ApplicationsView;
