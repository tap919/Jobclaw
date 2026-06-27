# Mutly Unified Build Pipeline — Design Spec

- **Date**: 2026-06-05
- **Status**: Draft
- **Target System**: Mutly Daemon Agent
- **Inspired By**: agent-skills, agentmemory, Claude-Code-Game-Studios, DeepSeek-Reasonix, cmux, taste-skill

---

## 1. Executive Summary

Mutly's current UI is a collection of disconnected tabs (Source Import, Dashboard, REPL Engine, CodeAuditor, Memory, etc.) that don't share data. This spec describes a **unified autonomous Build Pipeline** that chains these capabilities together into a single closed-loop system. The pipeline ingests a repository, audits it with RepoRank, plans fixes using Vibeserve, builds iteratively, re-reviews until quality thresholds are met, and produces a deployment-ready artifact.

The architecture is modular — each phase is a composable "skill" that can be run independently or chained. The pipeline is designed for **autonomous mode**: the user provides a repo, Mutly handles everything else, only pausing if a gate fails irrecoverably.

---

## 2. Pipeline Architecture

### 2.1 Phase Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MUTLY BUILD PIPELINE (Autonomous Loop)               │
│                                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│  │ INGEST   │──▶│  AUDIT   │──▶│  PLAN    │──▶│  BUILD   │                │
│  │ (source) │   │(RepoRank)│   │(Vibeserve)│   │(Vibeserve)               │
│  └──────────┘   └──────────┘   └──────────┘   └────┬─────┘               │
│                                                    │                        │
│  ┌────────────────────────────────────────────┐    │                        │
│  │            ITERATION LOOP                   │    │                        │
│  │  ┌──────────┐    ┌──────────────┐          │    │                        │
│  │  │  REVIEW  │◄───│   BUILD      │◄─────────┘    │                        │
│  │  │(RepoRank)│    │  (Vibeserve) │               │                        │
│  │  │ Score≥80?│    └──────────────┘               │                        │
│  │  └────┬─────┘                                   │                        │
│  │       │                                         │                        │
│  │  PASS │ (loop back to BUILD for fixes)          │                        │
│  │       ▼                                         │                        │
│  │  ┌──────────┐                                   │                        │
│  │  │  READY   │                                   │                        │
│  │  │ (deploy) │                                   │                        │
│  │  └──────────┘                                   │                        │
│  └────────────────────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Phase Definitions

| Phase | ID | Service | Input | Output | Gate |
|-------|----|---------|-------|--------|------|
| **INGEST** | `P1_INGEST` | Mutly API | GitHub URL or local folder + files | Workspace directory populated, file manifest | File count > 0 |
| **AUDIT** | `P2_AUDIT` | RepoRank | Workspace file manifest | Baseline score, issue list | Score returned |
| **PLAN** | `P3_PLAN` | Vibeserve + AgentRouter | Audit issues + file manifest | Finalization template (ordered fix list) | Plan has ≥1 steps |
| **BUILD** | `P4_BUILD` | Vibeserve (vibe_code, vibe_iterate) | Finalization template | Modified files | All steps complete |
| **REVIEW** | `P5_REVIEW` | RepoRank | Modified workspace | New score + remaining issues | Score ≥ 80 |
| **ITERATE** | `P6_ITERATE` | — | Remaining issues | Delta plan for remaining issues | Score ≥ 80 or max 3 iterations |
| **READY** | `P7_READY` | Vibeserve (vibe_deploy) | PASS from REVIEW | Deployment config, summary | Final artifact |

### 2.3 State Machine

Each pipeline instance has a state that persists in `db.json`:

```typescript
interface PipelineState {
  id: string;
  status: "idle" | "running" | "paused" | "completed" | "failed";
  currentPhase: PhaseId;
  phases: Record<PhaseId, PhaseResult>;
  workspaceId: string;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

interface PhaseResult {
  status: "pending" | "running" | "passed" | "failed" | "skipped";
  output?: any;
  score?: number;
  issues?: AuditIssue[];
  plan?: ExecutionPlan;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}
```

---

## 3. Phase 1: INGEST (Source Import)

### 3.1 Purpose
Accept a user's project from a GitHub URL or local folder upload, copy it into Mutly's workspace, and produce a file manifest for downstream phases.

### 3.2 Implementation

**Backend — `server/buildPipeline/p1_ingest.ts`:**
```typescript
export interface IngestInput {
  source: "github" | "local";
  repoUrl?: string;
  files?: FileRecord[];
}
export interface IngestResult {
  workspaceId: string;
  workspacePath: string;
  fileCount: number;
  totalLines: number;
  manifest: FileRecord[];
}
```

- For **GitHub**: clone the repo into `mutly_data/workspaces/{id}/`
- For **local**: copy the uploaded files into `mutly_data/workspaces/{id}/`
- Run `scanWorkspace()` on the actual imported directory (not `process.cwd()`)
- Return the manifest

**Frontend — Phase replaces SourceImport tab:**
- Keep the "Select Folder" / "GitHub URL" UI (it already works)
- On selection → upload files to `POST /api/pipeline/ingest`
- Show real progress (file-by-file copy), not fake terminal logs
- On completion → auto-transition to AUDIT phase

### 3.3 Gate Condition
- `fileCount > 0`: at least one file was imported
- `manifest.length > 0`: file manifest was generated

---

## 4. Phase 2: AUDIT (RepoRank Baseline)

### 4.1 Purpose
Run RepoRank audit on the imported workspace to establish a baseline quality score and enumerate all issues that need fixing.

### 4.2 Implementation

**Backend — `server/buildPipeline/p2_audit.ts`:**
```typescript
export interface AuditInput {
  workspaceId: string;
  workspacePath: string;
  manifest: FileRecord[];
}
export interface AuditResult {
  score: number;
  issues: AuditIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  rawReport: any;
}
```

- Call `ReporankAuditService.auditWorkspace()` on the imported workspace
- Classify issues by severity
- Score is the baseline for all future comparisons
- If no GEMINI_API_KEY, use local heuristic scoring (already exists as fallback)

**API endpoint:** `POST /api/pipeline/audit` → takes workspaceId, returns AuditResult

### 4.3 Gate Condition
- `score >= 0`: audit completed (even 0 is valid — it just means there's work to do)
- `issues` array populated

---

## 5. Phase 3-7 (Future)

### 5.3 PLAN (Phase 3)
- Call Vibeserve `vibe_architect` with the audit issues
- Generate a finalization template: an ordered list of `FixStep` items
- Each `FixStep` directly addresses one or more RepoRank audit issues

### 5.4 BUILD (Phase 4)
- Execute each `FixStep` via `workflowRunner` → `AgentRouter` → `vibe_code`
- After each step, run `vibe_iterate` to refine
- Track which audit issues each step resolved

### 5.5 REVIEW (Phase 5)
- Re-run RepoRank on the modified workspace
- Compare score against baseline
- If score >= 80 → PASS → proceed to READY
- If score < 80 → FAIL → return remaining issues to ITERATE

### 5.6 ITERATE (Phase 6)
- Collect audit issues that weren't fixed in the build pass
- Generate a delta plan targeting only the remaining issues
- Re-enter BUILD phase
- Max 3 iterations before manual intervention

### 5.7 READY (Phase 7)
- Call Vibeserve `vibe_deploy` to generate deployment config
- Produce a final summary report
- Notify via WebSocket

---

## 6. Frontend: Build Pipeline Tab

Replace the current sidebar tab structure with a unified **Build** view:

### 6.1 Layout

```
┌──────────────────────────────────────────────────────┐
│ [Sidebar]                        │ [Main Content]     │
│                                  │                    │
│  ● Source Import                 │  BUILD PIPELINE    │
│  ○ Dashboard                     │                    │
│  ○ SPEC.md                       │  [▶ Run Pipeline]  │
│  ○ REPL Engine                   │                    │
│  ○ Grep & AST                    │  ─── INGEST ────── │
│  ○ Mutly Daemon                  │  ✓ 12 files copied │
│  ○ Token Compactor               │  ─── AUDIT ─────── │
│  ○ Secure Sandbox                │  ⟲ Running...      │
│  ○ Context Injector              │  Score: 45/100     │
│  ○ IDE Integrations              │  ─── PLAN ──────── │
│  ○ Code Nexus Audit              │  ○ Waiting...      │
│  ○ Sidebar Controls              │  ─── BUILD ─────── │
│  ────────────────                │  ○ Waiting...      │
│  ● Build Pipeline   ← NEW!       │  ─── REVIEW ───── │
│                                  │  ○ Waiting...      │
│                                  │  ─── READY ─────── │
│                                  │  ○ Waiting...      │
└──────────────────────────────────────────────────────┘
```

### 6.2 Pipeline Control

| Element | Behavior |
|---------|----------|
| **▶ Run Pipeline** | Starts INGEST phase; auto-advances through all phases |
| **Pause/Resume** | Pauses after current phase completes |
| **Cancel** | Stops pipeline and cleans up workspace |
| **Phase indicator** | Shows current status: pending → running → passed/failed |
| **Log stream** | Real-time logs per phase via WebSocket |

---

## 7. Error Handling

| Error | Behavior |
|-------|----------|
| INGEST fails (invalid URL) | Stop, show error, allow retry |
| AUDIT fails (no files) | Stop, return to INGEST |
| PLAN fails (no AI response) | Fall back to heuristic plan (already exists) |
| BUILD step fails | Retry once; if still fails, skip step and mark it in report |
| REVIEW score < 80 | Auto-enter ITERATE loop, up to 3 attempts |
| ITERATE max attempts | Stop pipeline, show report of remaining issues |

---

## 8. OSS Patterns Incorporated

| OSS Tool | Pattern | Where It Goes |
|----------|---------|---------------|
| agent-skills | Composable skill modules | Each phase is a `BuildPhase` class loaded from a registry |
| agentmemory | Persistent cross-session memory | Pipeline state persists via `db.json` + VibeServe memory tools |
| Claude-Code-Game-Studios | Multi-agent coordination | `workflowRunner` dispatches specialist agents per phase |
| DeepSeek-Reasonix | Prefix-cache stable prompts | Vibeserve tools re-use cached contexts for speed |
| taste-skill | Quality guardrails | RepoRank gate at every phase transition |
| cmux | Real-time streaming | WebSocket events for every phase transition |

---

## 9. Implementation Roadmap

| Phase | Backend | Frontend | Effort |
|-------|---------|----------|--------|
| **P1 INGEST** | `p1_ingest.ts` + `POST /api/pipeline/ingest` | Build Pipeline tab shell, file upload | 3-4h |
| **P2 AUDIT** | `p2_audit.ts` + `POST /api/pipeline/audit` | Phase status indicators, progress display | 2-3h |
| P3 PLAN | Plan template generator + Vibeserve arch call | Plan review UI | 3-4h |
| P4 BUILD | WorkflowRunner integration + step executor | Build step visualization | 4-6h |
| P5 REVIEW | Score comparison + gate logic | Review results display | 2-3h |
| P6 ITERATE | Loop controller + max-attempts tracking | Iteration counter | 1-2h |
| P7 READY | Deploy config generator + summary | Final summary view | 2-3h |
