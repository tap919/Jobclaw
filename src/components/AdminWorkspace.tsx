import React from "react";
import WorkspaceStudioView from "./WorkspaceStudioView";
import AnalyticsView from "./AnalyticsView";
import SettingsView from "./SettingsView";

export default function AdminWorkspace() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Admin Workspace</h2>
      <WorkspaceStudioView jobs={[]} applications={[]} onTriggerApplicationTracking={() => {}} />
      <AnalyticsView />
      <SettingsView geminiConnected={true} />
    </div>
  );
}