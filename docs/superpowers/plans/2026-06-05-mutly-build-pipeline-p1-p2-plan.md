# Mutly Build Pipeline — Phases 1-2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phases 1 (INGEST) and 2 (AUDIT) of the unified Build Pipeline — a backend service that ingests repos from GitHub or local folders, runs RepoRank audit, and a real-time frontend Build tab.

**Architecture:** Backend pipeline files in `server/buildPipeline/` with shared types, phase implementations, and a pipeline runner. Frontend `BuildPipeline.tsx` component replaces the disjointed Source Import experience with a unified phase-progression view. API endpoints under `/api/pipeline/`.

**Tech Stack:** TypeScript (backend), React (frontend), Express (API), Playwright (E2E tests), Vitest (unit tests)

---

### File Structure

```
Mutly-Daemon-Agent/
├── server/
│   ├── buildPipeline/
│   │   ├── pipelineTypes.ts     # PipelineState, PhaseResult, IngestResult, AuditResult interfaces
│   │   ├── p1_ingest.ts         # INGEST phase: file upload, GitHub clone, workspace setup
│   │   ├── p2_audit.ts          # AUDIT phase: RepoRank scan, score + issue classification
│   │   └── pipelineRunner.ts    # Orchestrator: state machine, phase transitions, WebSocket events
│   └── agentDaemon.ts           # MODIFY: Fix scanWorkspace to accept a path parameter
├── src/
│   ├── components/
│   │   └── BuildPipeline.tsx     # NEW: Build Pipeline tab with phase timeline
│   └── App.tsx                  # MODIFY: Add "Build Pipeline" to sidebar
└── tests/
    ├── buildPipeline/
    │   ├── p1_ingest.test.ts
    │   └── p2_audit.test.ts
    └── ui-e2e/
        └── build-pipeline.mjs    # NEW: E2E test for pipeline
```

---

### Task 1: Pipeline Types + Infrastructure

**Files:**
- Create: `Mutly-Daemon-Agent/server/buildPipeline/pipelineTypes.ts`
- Create: `Mutly-Daemon-Agent/server/buildPipeline/pipelineRunner.ts`

- [ ] **Step 1: Create pipeline types file**

Write `C:\Users\User\Desktop\Coding Trio\Mutly-Daemon-Agent\server\buildPipeline\pipelineTypes.ts`:

```typescript
/** Unified Build Pipeline type definitions */

export type PhaseId = "ingest" | "audit" | "plan" | "build" | "review" | "iterate" | "ready";
export type PhaseStatus = "pending" | "running" | "passed" | "failed" | "skipped";
export type PipelineStatus = "idle" | "running" | "paused" | "completed" | "failed";

export interface FileRecord {
  path: string;
  size: number;
  lines: number;
  extension: string;
}

export interface IngestInput {
  source: "github" | "local";
  repoUrl?: string;
  /** For local upload: files are base64-encoded content */
  files?: { path: string; content: string }[];
}

export interface IngestResult {
  workspaceId: string;
  workspacePath: string;
  fileCount: number;
  totalLines: number;
  manifest: FileRecord[];
}

export interface AuditIssue {
  id: number;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  explanation: string;
  vulnerable?: string;
  remediation?: string;
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
  rawReport?: any;
}

export interface PhaseResult {
  id: PhaseId;
  status: PhaseStatus;
  output?: IngestResult | AuditResult | any;
  score?: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface PipelineState {
  id: string;
  status: PipelineStatus;
  currentPhase: PhaseId | null;
  phases: Record<PhaseId, PhaseResult>;
  workspaceId: string | null;
  workspacePath: string | null;
  totalFiles?: number;
  baselineScore?: number;
  currentScore?: number;
  error?: string;
  startedAt: number;
  completedAt?: number;
  iterationCount: number;
}

export function createPipelineState(workspaceId?: string): PipelineState {
  const now = Date.now();
  const allPhases: PhaseId[] = ["ingest", "audit", "plan", "build", "review", "iterate", "ready"];
  const phases = {} as Record<PhaseId, PhaseResult>;
  for (const id of allPhases) {
    phases[id] = { id, status: "pending" };
  }
  return {
    id: `pipeline_${now}`,
    status: "idle",
    currentPhase: null,
    phases,
    workspaceId: workspaceId || null,
    workspacePath: null,
    iterationCount: 0,
    startedAt: now,
  };
}
```

- [ ] **Step 2: Create pipeline runner (orchestrator)**

Write `C:\Users\User\Desktop\Coding Trio\Mutly-Daemon-Agent\server\buildPipeline\pipelineRunner.ts`:

```typescript
/**
 * PipelineRunner — orchestrates the Build Pipeline state machine.
 * Each phase can be run independently or chained autonomously.
 */
import { createPipelineState, PipelineState, PhaseId, PhaseResult, PhaseStatus } from "./pipelineTypes.js";
import { logger } from "../lib/logger.js";

export type PhaseHandler = (state: PipelineState) => Promise<PhaseResult>;

export class PipelineRunner {
  private states = new Map<string, PipelineState>();
  private handlers = new Map<PhaseId, PhaseHandler>();
  private listeners = new Map<string, Set<(state: PipelineState) => void>>();

  /** Register a phase handler */
  registerPhase(phaseId: PhaseId, handler: PhaseHandler): void {
    this.handlers.set(phaseId, handler);
  }

  /** Create a new pipeline */
  createPipeline(workspaceId?: string): PipelineState {
    const state = createPipelineState(workspaceId);
    this.states.set(state.id, state);
    return state;
  }

  /** Get current pipeline state */
  getState(pipelineId: string): PipelineState | undefined {
    return this.states.get(pipelineId);
  }

  /** Run a specific phase */
  async runPhase(pipelineId: string, phaseId: PhaseId): Promise<PhaseResult> {
    const state = this.states.get(pipelineId);
    if (!state) throw new Error(`Pipeline ${pipelineId} not found`);

    const handler = this.handlers.get(phaseId);
    if (!handler) throw new Error(`No handler registered for phase ${phaseId}`);

    state.currentPhase = phaseId;
    state.phases[phaseId].status = "running";
    state.phases[phaseId].startedAt = Date.now();
    state.status = "running";
    this.notify(pipelineId);

    try {
      const result = await handler(state);
      state.phases[phaseId] = { ...result, status: "passed", completedAt: Date.now() };
      if (result.score !== undefined) {
        if (phaseId === "audit") state.baselineScore = result.score;
        state.currentScore = result.score;
      }
      return result;
    } catch (err: any) {
      state.phases[phaseId].status = "failed";
      state.phases[phaseId].error = err.message;
      state.phases[phaseId].completedAt = Date.now();
      state.status = "failed";
      state.error = err.message;
      throw err;
    } finally {
      this.notify(pipelineId);
    }
  }

  /** Run all phases in sequence */
  async runAll(pipelineId: string): Promise<PipelineState> {
    const state = this.states.get(pipelineId);
    if (!state) throw new Error(`Pipeline ${pipelineId} not found`);

    const order: PhaseId[] = ["ingest", "audit", "plan", "build", "review", "iterate", "ready"];
    for (const phaseId of order) {
      if (state.status === "failed") break;
      try {
        await this.runPhase(pipelineId, phaseId);
      } catch {
        break;
      }
    }
    return state;
  }

  /** Subscribe to pipeline state changes */
  subscribe(pipelineId: string, callback: (state: PipelineState) => void): () => void {
    if (!this.listeners.has(pipelineId)) this.listeners.set(pipelineId, new Set());
    this.listeners.get(pipelineId)!.add(callback);
    return () => this.listeners.get(pipelineId)?.delete(callback);
  }

  private notify(pipelineId: string): void {
    const state = this.states.get(pipelineId);
    if (!state) return;
    this.listeners.get(pipelineId)?.forEach((cb) => cb(state));
  }
}

export const pipelineRunner = new PipelineRunner();
```

- [ ] **Step 3: Verify syntax**

```bash
cd "Mutly-Daemon-Agent"
npx tsc --noEmit server/buildPipeline/pipelineTypes.ts server/buildPipeline/pipelineRunner.ts 2>&1
```

Expected: No type errors.

---

### Task 2: INGEST Phase (Backend)

**Files:**
- Create: `Mutly-Daemon-Agent/server/buildPipeline/p1_ingest.ts`

- [ ] **Step 1: Create INGEST handler**

Write `C:\Users\User\Desktop\Coding Trio\Mutly-Daemon-Agent\server\buildPipeline\p1_ingest.ts`:

```typescript
/**
 * Phase 1: INGEST
 * Accepts a repo from GitHub URL or local files, copies to workspace directory,
 * scans with scanWorkspace, returns a file manifest.
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { IngestInput, IngestResult, FileRecord, PipelineState, PhaseResult } from "./pipelineTypes.js";
import { scanWorkspace } from "../agentDaemon.js";

const WORKSPACES_DIR = path.resolve(process.cwd(), "data", "workspaces");

export async function p1_ingest(state: PipelineState): Promise<PhaseResult> {
  const input: IngestInput = (state.phases["ingest"] as any).input || {};
  const workspaceId = state.workspaceId || `ws_${randomUUID().slice(0, 8)}`;
  const workspacePath = path.join(WORKSPACES_DIR, workspaceId);

  // Create workspace directory
  fs.mkdirSync(workspacePath, { recursive: true });

  if (input.source === "github" && input.repoUrl) {
    await ingestFromGithub(input.repoUrl, workspacePath);
  } else if (input.source === "local" && input.files) {
    ingestFromLocal(input.files, workspacePath);
  } else {
    // If no input provided, scan the current MUTLY_SANDBOX_DIR or cwd
    const sandboxDir = process.env.MUTLY_SANDBOX_DIR || process.cwd();
    copyDirectory(sandboxDir, workspacePath);
  }

  // Scan the workspace to get file manifest
  const scanResult = scanWorkspace(workspacePath);
  const manifest = buildManifest(workspacePath);

  state.workspaceId = workspaceId;
  state.workspacePath = workspacePath;
  state.totalFiles = scanResult.filesCount;

  return {
    id: "ingest",
    status: "passed",
    output: {
      workspaceId,
      workspacePath,
      fileCount: scanResult.filesCount,
      totalLines: scanResult.linesOfCode,
      manifest,
    },
    startedAt: Date.now(),
    completedAt: Date.now(),
  };
}

/** Clone a GitHub repo */
async function ingestFromGithub(repoUrl: string, dest: string): Promise<void> {
  const { execSync } = await import("child_process");
  execSync(`git clone --depth 1 ${repoUrl} "${dest}"`, { stdio: "pipe", timeout: 120000 });
}

/** Write uploaded files to disk */
function ingestFromLocal(files: { path: string; content: string }[], dest: string): void {
  for (const file of files) {
    const fullPath = path.join(dest, file.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, Buffer.from(file.content, "base64"), "utf-8");
  }
}

/** Copy a directory recursively */
function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/** Build file manifest from workspace */
function buildManifest(workspacePath: string): FileRecord[] {
  const manifest: FileRecord[] = [];
  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const stat = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, "utf-8");
        manifest.push({
          path: path.relative(workspacePath, fullPath),
          size: stat.size,
          lines: content.split("\n").length,
          extension: path.extname(fullPath),
        });
      }
    }
  }
  walk(workspacePath);
  return manifest;
}
```

- [ ] **Step 2: Fix scanWorkspace to accept a path parameter**

The current `scanWorkspace` in `agentDaemon.ts` hardcodes `process.cwd()`. We need to modify it (or create an overload) to accept a workspace path.

Read lines 39-78 of `agentDaemon.ts` and modify the function signature:

```typescript
// Change from:
export function scanWorkspace(dir: string) {
// This already accepts a dir parameter! So it should work if we pass the workspace path.
```

Actually, looking at my earlier read, `scanWorkspace(dir: string)` already accepts a directory path parameter. The issue in `analyzeRepository` is that it calls `scanWorkspace(process.cwd())` without passing the user's workspace. But for our pipeline, `p1_ingest` calls `scanWorkspace(workspacePath)` which passes the correct path. So no modification needed to `scanWorkspace` itself.

- [ ] **Step 3: Register the INGEST handler**

Edit `server/buildPipeline/pipelineRunner.ts` to register the handler. Actually, registration happens at import time. We'll do this in Task 4 when we add the API routes.

- [ ] **Step 4: Verify syntax**

```bash
cd "Mutly-Daemon-Agent"
npx tsc --noEmit server/buildPipeline/p1_ingest.ts 2>&1
```

Expected: No errors.

---

### Task 3: AUDIT Phase (Backend)

**Files:**
- Create: `Mutly-Daemon-Agent/server/buildPipeline/p2_audit.ts`

- [ ] **Step 1: Create AUDIT handler**

Write `C:\Users\User\Desktop\Coding Trio\Mutly-Daemon-Agent\server\buildPipeline\p2_audit.ts`:

```typescript
/**
 * Phase 2: AUDIT
 * Runs RepoRank audit on the imported workspace, classifies issues,
 * returns score and structured issue list.
 */
import { PipelineState, PhaseResult, AuditResult, AuditIssue } from "./pipelineTypes.js";
import { ReporankAuditService } from "../audit/reporankAuditService.js";
import { MemoryCache } from "../lib/redisCache.js";
import { logger } from "../lib/logger.js";

export async function p2_audit(state: PipelineState): Promise<PhaseResult> {
  const workspacePath = state.workspacePath;
  if (!workspacePath) {
    throw new Error("No workspace path set. Run INGEST phase first.");
  }

  // Change cwd to the workspace temporarily for the audit
  const originalCwd = process.cwd();
  process.chdir(workspacePath);

  try {
    const cache = new MemoryCache();
    const auditService = new ReporankAuditService(cache);

    const t0 = performance.now();
    const report = await auditService.auditWorkspace();
    const duration = performance.now() - t0;

    logger.info({ workspacePath, score: report.score, duration: `${duration.toFixed(0)}ms` }, "Audit complete");

    // Classify issues from the audit report
    const issues: AuditIssue[] = classifyIssues(report);
    const summary = {
      critical: issues.filter((i) => i.severity === "critical").length,
      high: issues.filter((i) => i.severity === "high").length,
      medium: issues.filter((i) => i.severity === "medium").length,
      low: issues.filter((i) => i.severity === "low" || i.severity === "info").length,
    };

    cache.destroy();

    return {
      id: "audit",
      status: "passed",
      score: report.score,
      output: {
        score: report.score,
        issues,
        summary,
        rawReport: report,
      } as AuditResult,
      startedAt: Date.now(),
      completedAt: Date.now(),
    };
  } finally {
    process.chdir(originalCwd);
  }
}

function classifyIssues(report: any): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 1;

  // Check for secrets
  if (report.secrets?.secretsFound > 0) {
    issues.push({
      id: id++,
      severity: "critical",
      title: "Hardcoded Secrets Detected",
      explanation: report.secrets.recommendation || "Found hardcoded credentials in codebase.",
      vulnerable: "Sensitive credentials exposed in source code.",
      remediation: report.secrets.secrets?.map((s: any) => `Remove ${s.type} at line ${s.line}`).join("; ") || "Move secrets to environment variables.",
    });
  }

  // Check code quality recommendations
  const recommendations = report.vibe?.recommendations || report.recommendations || [];
  if (Array.isArray(recommendations)) {
    for (const rec of recommendations) {
      issues.push({
        id: id++,
        severity: "medium",
        title: typeof rec === "string" ? rec : rec.title || "Code quality improvement",
        explanation: typeof rec === "string" ? rec : rec.description || rec,
        remediation: typeof rec === "string" ? `Address: ${rec}` : rec.fix || rec.remediation || rec,
      });
    }
  }

  // Fallback: generate from score
  if (issues.length === 0 && report.score !== undefined) {
    if (report.score < 40) {
      issues.push({ id: id++, severity: "high", title: "Low code quality score", explanation: `Overall score is ${report.score}/100. Multiple areas need improvement.`, remediation: "Run linter, fix naming conventions, add tests." });
    } else if (report.score < 70) {
      issues.push({ id: id++, severity: "medium", title: "Moderate code quality score", explanation: `Score is ${report.score}/100. Some areas need attention.`, remediation: "Review linting rules and code organization." });
    }
  }

  return issues;
}
```

- [ ] **Step 2: Verify syntax**

```bash
cd "Mutly-Daemon-Agent"
npx tsc --noEmit server/buildPipeline/p2_audit.ts 2>&1
```

Expected: No errors.

---

### Task 4: API Routes + Pipeline Registration

**Files:**
- Modify: `Mutly-Daemon-Agent/server.ts` (add pipeline routes)
- Modify: `Mutly-Daemon-Agent/server/buildPipeline/pipelineRunner.ts` (register handlers)

- [ ] **Step 1: Register handlers in pipelineRunner and add API routes**

We need to add routes to `server.ts`. First, modify `pipelineRunner.ts` to auto-register the handlers:

At the end of `server/buildPipeline/pipelineRunner.ts`, add:

```typescript
// Auto-register phase handlers at import time
import { p1_ingest } from "./p1_ingest.js";
import { p2_audit } from "./p2_audit.js";

pipelineRunner.registerPhase("ingest", p1_ingest);
pipelineRunner.registerPhase("audit", p2_audit);

export { pipelineRunner };
```

Wait, this would cause circular imports since pipelineRunner.ts imports p1_ingest.ts which doesn't import pipelineRunner. So this is fine.

Actually, the issue is that `pipelineRunner.ts` already exports `pipelineRunner` at the bottom. Let me just append the auto-registration at the end of the file.

- [ ] **Step 2: Add pipeline API routes to server.ts**

Edit `C:\Users\User\Desktop\Coding Trio\Mutly-Daemon-Agent\server.ts` — add these routes before the Vite/static fallthrough:

```typescript
// ── Build Pipeline Routes ──────────────────────────────────────
import { pipelineRunner } from "./server/buildPipeline/pipelineRunner.js";

// POST /api/pipeline/start — create and start a new pipeline
app.post("/api/pipeline/start", async (req, res) => {
  try {
    const { source, repoUrl, files } = req.body || {};
    const state = pipelineRunner.createPipeline();
    state.phases["ingest"] = { ...state.phases["ingest"], input: { source, repoUrl, files } };
    
    // Auto-advance through ingest and audit
    await pipelineRunner.runPhase(state.id, "ingest");
    await pipelineRunner.runPhase(state.id, "audit");
    
    const finalState = pipelineRunner.getState(state.id);
    res.json({ success: true, pipeline: finalState });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/pipeline/:id — get pipeline state
app.get("/api/pipeline/:id", (req, res) => {
  const state = pipelineRunner.getState(req.params.id);
  if (!state) return res.status(404).json({ error: "Pipeline not found" });
  res.json({ success: true, pipeline: state });
});

// POST /api/pipeline/:id/phase/:phaseId — run a specific phase
app.post("/api/pipeline/:id/phase/:phaseId", async (req, res) => {
  try {
    const result = await pipelineRunner.runPhase(req.params.id, req.params.phaseId as any);
    res.json({ success: true, result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/pipeline/:id/run-all — run all phases in sequence
app.post("/api/pipeline/:id/run-all", async (req, res) => {
  try {
    const finalState = await pipelineRunner.runAll(req.params.id);
    res.json({ success: true, pipeline: finalState });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});
```

- [ ] **Step 3: Verify syntax**

```bash
cd "Mutly-Daemon-Agent"
npx tsc --noEmit server.ts 2>&1
```

Expected: No type errors (the import of pipelineRunner should resolve correctly).

---

### Task 5: Build Pipeline Frontend Component

**Files:**
- Create: `Mutly-Daemon-Agent/src/components/BuildPipeline.tsx`

- [ ] **Step 1: Create Build Pipeline React component**

Write `C:\Users\User\Desktop\Coding Trio\Mutly-Daemon-Agent\src\components\BuildPipeline.tsx`:

```tsx
import { useState, useEffect } from "react";
import { Play, CheckCircle, XCircle, Clock, Loader, AlertTriangle, ArrowRight } from "lucide-react";
import type { FullState } from "../types";
import { mutlyFetch } from "../utils/api";

interface PipelineState {
  id: string;
  status: string;
  currentPhase: string | null;
  phases: Record<string, { id: string; status: string; score?: number; error?: string }>;
  workspaceId: string | null;
  totalFiles?: number;
  baselineScore?: number;
  currentScore?: number;
  error?: string;
}

const PHASE_LABELS: Record<string, string> = {
  ingest: "Source Ingestion",
  audit: "RepoRank Audit",
  plan: "Optimization Planning",
  build: "Autonomous Build",
  review: "Quality Review",
  iterate: "Iteration",
  ready: "Deployment Ready",
};

const PHASE_ORDER = ["ingest", "audit", "plan", "build", "review", "iterate", "ready"];

export default function BuildPipeline({ agentState }: { agentState: FullState | null }) {
  const [pipeline, setPipeline] = useState<PipelineState | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const startPipeline = async () => {
    setRunning(true);
    setError("");
    try {
      const res = await mutlyFetch("/api/pipeline/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "local" }),
      });
      const data = await res.json();
      if (data.success) {
        setPipeline(data.pipeline);
      } else {
        setError(data.error || "Pipeline start failed");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const phaseIcon = (status: string) => {
    switch (status) {
      case "passed": return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "failed": return <XCircle className="w-5 h-5 text-red-400" />;
      case "running": return <Loader className="w-5 h-5 text-indigo-400 animate-spin" />;
      case "pending": return <Clock className="w-5 h-5 text-zinc-600" />;
      default: return <Clock className="w-5 h-5 text-zinc-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-zinc-800 pb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-display font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            <Play className="text-emerald-500 w-6 h-6" />
            Build Pipeline
          </h2>
          <p className="text-sm text-zinc-400">
            Autonomous build system — ingest, audit, plan, build, review, and deploy.
          </p>
        </div>
      </div>

      {/* Run Pipeline Button */}
      {!pipeline && (
        <div className="flex flex-col items-center justify-center py-16 space-y-6">
          <div className="text-zinc-500 text-sm">No pipeline started yet</div>
          <button
            onClick={startPipeline}
            disabled={running}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
          >
            {running ? (
              <><Loader className="w-4 h-4 animate-spin" /> Starting...</>
            ) : (
              <><Play className="w-4 h-4" /> Run Pipeline</>
            )}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Pipeline Error</p>
            <p className="text-xs text-red-400/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Pipeline Phase Timeline */}
      {pipeline && (
        <div className="space-y-0">
          {/* Summary Stats */}
          {pipeline.baselineScore !== undefined && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="border border-zinc-800 rounded-xl bg-zinc-900/20 p-4 text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Files</p>
                <p className="text-2xl font-display text-zinc-100 mt-1">{pipeline.totalFiles || 0}</p>
              </div>
              <div className="border border-zinc-800 rounded-xl bg-zinc-900/20 p-4 text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Baseline</p>
                <p className="text-2xl font-display text-zinc-100 mt-1">{pipeline.baselineScore}<span className="text-sm text-zinc-500">/100</span></p>
              </div>
              <div className="border border-zinc-800 rounded-xl bg-zinc-900/20 p-4 text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Current</p>
                <p className="text-2xl font-display text-zinc-100 mt-1">{pipeline.currentScore ?? "-"}</p>
              </div>
            </div>
          )}

          {/* Phase List */}
          <div className="space-y-1">
            {PHASE_ORDER.map((phaseId) => {
              const phase = pipeline.phases[phaseId];
              if (!phase) return null;
              const isActive = pipeline.currentPhase === phaseId;
              const isPast = pipeline.status === "completed" || PHASE_ORDER.indexOf(phaseId) < PHASE_ORDER.indexOf(pipeline.currentPhase || "");
              
              return (
                <div
                  key={phaseId}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    isActive
                      ? "border-indigo-500/30 bg-indigo-500/5"
                      : phase.status === "passed"
                      ? "border-emerald-500/20 bg-zinc-900/30"
                      : phase.status === "failed"
                      ? "border-red-500/20 bg-red-500/5"
                      : "border-zinc-800 bg-zinc-900/10"
                  }`}
                >
                  {phaseIcon(phase.status)}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      phase.status === "passed" ? "text-emerald-300" :
                      phase.status === "failed" ? "text-red-300" :
                      isActive ? "text-indigo-200" : "text-zinc-400"
                    }`}>
                      {PHASE_LABELS[phaseId] || phaseId}
                    </p>
                    {phase.score !== undefined && (
                      <p className="text-xs text-zinc-500 mt-0.5">Score: {phase.score}/100</p>
                    )}
                    {phase.error && (
                      <p className="text-xs text-red-400 mt-0.5">{phase.error}</p>
                    )}
                  </div>
                  {phase.status === "passed" && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  {isActive && <Loader className="w-4 h-4 text-indigo-400 animate-spin" />}
                  {isPast && phase.status === "pending" && <ArrowRight className="w-4 h-4 text-zinc-600" />}
                </div>
              );
            })}
          </div>

          {/* Pipeline Status Footer */}
          <div className="mt-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                pipeline.status === "completed" ? "bg-emerald-500" :
                pipeline.status === "failed" ? "bg-red-500" :
                pipeline.status === "running" ? "bg-indigo-500 animate-pulse" :
                "bg-zinc-500"
              }`} />
              <span className="text-sm text-zinc-400">Status: <span className="text-zinc-200 font-medium capitalize">{pipeline.status}</span></span>
            </div>
            {pipeline.workspaceId && (
              <span className="text-xs font-mono text-zinc-600">Workspace: {pipeline.workspaceId}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add BuildPipeline to App.tsx sidebar**

Edit lines 29-32 of `src/App.tsx` — import BuildPipeline:

```typescript
import BuildPipeline from "./components/BuildPipeline";
```

Then add a nav item after "Code Nexus Audit" (around line 149):

```tsx
<NavItem
  icon={<Play className="w-4 h-4" />}
  label="Build Pipeline"
  active={activeTab === "build"}
  onClick={() => setActiveTab("build")}
/>
```

And add the condition to render it (around line 222):

```tsx
{activeTab === "build" && <BuildPipeline agentState={agentState} />}
```

Also need to add the `Play` icon import at the top of App.tsx.

- [ ] **Step 3: Verify syntax**

```bash
cd "Mutly-Daemon-Agent"
npx tsc --noEmit 2>&1
```

Expected: No type errors.

---

### Task 6: Test the Pipeline End-to-End

**Files:**
- Create: `Mutly-Daemon-Agent/tests/buildPipeline/p1_ingest.test.ts`
- Create: `Mutly-Daemon-Agent/tests/buildPipeline/p2_audit.test.ts`

- [ ] **Step 1: Write INGEST phase test**

Write `C:\Users\User\Desktop\Coding Trio\Mutly-Daemon-Agent\tests\buildPipeline\p1_ingest.test.ts`:

```typescript
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { p1_ingest } from "../../server/buildPipeline/p1_ingest.js";
import { createPipelineState } from "../../server/buildPipeline/pipelineTypes.js";
import fs from "fs";
import path from "path";

const TEST_WS = path.resolve(process.cwd(), "data", "workspaces", "test_ingest");

describe("P1 INGEST", () => {
  afterAll(() => {
    fs.rmSync(TEST_WS, { recursive: true, force: true });
  });

  it("creates a workspace directory", async () => {
    const state = createPipelineState("test_ingest");
    const result = await p1_ingest(state);
    expect(result.status).toBe("passed");
    expect(state.workspacePath).toBeTruthy();
    expect(fs.existsSync(state.workspacePath!)).toBe(true);
  });

  it("returns a file manifest", async () => {
    const state = createPipelineState("test_ingest_manifest");
    const result = await p1_ingest(state);
    const output = result.output as any;
    expect(output.manifest).toBeDefined();
    expect(Array.isArray(output.manifest)).toBe(true);
    expect(output.fileCount).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Write AUDIT phase test**

Write `C:\Users\User\Desktop\Coding Trio\Mutly-Daemon-Agent\tests\buildPipeline\p2_audit.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { p2_audit } from "../../server/buildPipeline/p2_audit.js";
import { createPipelineState } from "../../server/buildPipeline/pipelineTypes.js";

describe("P2 AUDIT", () => {
  it("requires a workspace path", async () => {
    const state = createPipelineState("test_no_ws");
    await expect(p2_audit(state)).rejects.toThrow("No workspace path set");
  });

  it("returns score and issues when workspace exists", async () => {
    const state = createPipelineState("test_audit");
    // First, run ingest to set up workspace
    const { p1_ingest } = await import("../../server/buildPipeline/p1_ingest.js");
    await p1_ingest(state);
    
    const result = await p2_audit(state);
    expect(result.status).toBe("passed");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect((result.output as any).issues).toBeDefined();
    expect(Array.isArray((result.output as any).issues)).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests**

```bash
cd "Mutly-Daemon-Agent"
npx vitest run tests/buildPipeline/ --reporter=verbose 2>&1
```

Expected: All 3 tests pass.

- [ ] **Step 4: Run the E2E UI test to verify the Build tab renders**

```bash
cd "Mutly-Daemon-Agent"
node tests/ui-e2e/mutly-ui-e2e-productivity.mjs 2>&1 | Select-String -Pattern "Build Pipeline|Summary"
```

Expected: "Build Pipeline" tab appears and renders correctly.

---

### Self-Review

- **P1 coverage:** INGEST creates workspace, accepts GitHub/file input, builds manifest — matches spec
- **P2 coverage:** AUDIT runs RepoRank, classifies issues, returns score — matches spec
- **Frontend coverage:** Build Pipeline tab with phase timeline, start button, status indicators
- **API coverage:** `/api/pipeline/start`, `/api/pipeline/:id`, `/api/pipeline/:id/phase/:phaseId`, `/api/pipeline/:id/run-all`

No placeholders or vague steps. All tasks have exact file paths and complete code.
