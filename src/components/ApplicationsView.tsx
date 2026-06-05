
import React from 'react';

const ApplicationsView = ({ applications, onUpdateApplicationStatus, onUpdateApplicationDocs }: any) => {
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
