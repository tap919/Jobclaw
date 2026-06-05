# Jobclaw UI Reduction & Workspace Restructuring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the Jobclaw interface by implementing a progressive disclosure model with four workspaces (Review, Automate, Resolve, Admin).

**Architecture:** Component-based reorganization:
1. `Review` (Dashboard, Jobs, Applications, Career Vault)
2. `Automate` (Resume Studio, Sector Packs - collapsed)
3. `Resolve` (Autopilot Console refactored to focus on Queue/Exceptions)
4. `Admin` (Workspace Studio, Analytics, Settings)

**Tech Stack:** React, Tailwind, Lucide Icons

---

### Task 1: Setup Admin Shell and Workspace Layout

**Files:**
- Create: `C:/Users/User/Desktop/jobclaw/src/components/AdminWorkspace.tsx`
- Modify: `C:/Users/User/Desktop/jobclaw/src/App.tsx`

- [ ] **Step 1: Create Admin Workspace Shell**
Create the component to hold Admin-only tools.

```tsx
// C:/Users/User/Desktop/jobclaw/src/components/AdminWorkspace.tsx
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
```

- [ ] **Step 2: Update App layout**
Import AdminWorkspace in `App.tsx` and prepare for structure switch.

- [ ] **Step 3: Commit**
```bash
git add src/components/AdminWorkspace.tsx src/App.tsx
git commit -m "feat: setup admin workspace shell"
```

### Task 2: Refactor Navigation Component

**Files:**
- Modify: `C:/Users/User/Desktop/jobclaw/src/components/Navigation.tsx`

- [ ] **Step 1: Update navigation structure to be grouped**
Redefine `navItems` to support hierarchy for the four workspaces.

```tsx
// Partial modification in Navigation.tsx
const navItems = [
  { group: "Review", items: [{ id: "dashboard", label: "Dashboard", icon: Grid2X2 }, ... ] },
  { group: "Admin", items: [{ id: "admin", label: "Admin Workspace", icon: ShieldAlert }, ...] }
];
```

- [ ] **Step 2: Commit**
```bash
git add src/components/Navigation.tsx
git commit -m "refactor: restructure navigation to grouped workspaces"
```

### Task 3: Refactor App State and Workspace Switching

**Files:**
- Modify: `C:/Users/User/Desktop/jobclaw/src/App.tsx`

- [ ] **Step 1: Implement new workspace switcher logic**
Update `activeTab` to `activeWorkspace` and map to workspace components (`ReviewWorkspace`, `ResolveWorkspace`, `AdminWorkspace`).

- [ ] **Step 2: Commit**
```bash
git add src/App.tsx
git commit -m "refactor: implement workspace-based rendering"
```

### Task 4: Collapse and Migrate Components

**Files:**
- Modify: `C:/Users/User/Desktop/jobclaw/src/components/ReviewWorkspace.tsx`
- Modify: `C:/Users/User/Desktop/jobclaw/src/components/ResolveWorkspace.tsx`

- [ ] **Step 1: Migrate Review components**
Move Dashboard, Jobs, Applications, CareerVault into `ReviewWorkspace.tsx`.

- [ ] **Step 2: Refactor Autopilot for Resolve Workspace**
Refactor `AutopilotConsoleView.tsx` into `ResolveWorkspace.tsx` emphasizing the Queue and Exception inbox.

- [ ] **Step 3: Commit**
```bash
git add src/components/ReviewWorkspace.tsx src/components/ResolveWorkspace.tsx
git commit -m "refactor: migrate and collapse components into workspaces"
```

### Task 5: Final Integration and Verification

**Files:**
- Modify: `C:/Users/User/Desktop/jobclaw/src/App.tsx`

- [ ] **Step 1: Cleanup unused components and routes**
Ensure all imports in `App.tsx` match the new workspace structure.

- [ ] **Step 2: Verify application integrity**
Run build to ensure no compile errors: `npm run build` (or equivalent).

- [ ] **Step 3: Commit**
```bash
git add src/App.tsx
git commit -m "feat: complete workspace restructuring and cleanup"
```