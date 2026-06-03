import React from "react";
import AutopilotConsoleView from "./AutopilotConsoleView";

interface ResolveWorkspaceProps {
  setActiveWorkspace: (workspace: string) => void;
}

const ResolveWorkspace: React.FC<ResolveWorkspaceProps> = ({ setActiveWorkspace }) => {
  return (
    <div>
      <AutopilotConsoleView 
        onNavigateBack={() => setActiveWorkspace("review")}
      />
    </div>
  );
};

export default ResolveWorkspace;