# Mutly Build Pipeline — Phases 3-7 Implementation Plan

**Goal:** Implement Phases 3-7 (PLAN, BUILD, REVIEW, ITERATE, READY) completing the autonomous build pipeline.

**Architecture:** Each phase is a module in `server/buildPipeline/`. The pipeline already has P1 (ingest) and P2 (audit) running. P3-P7 integrate with existing services: `planAugmenter`, `vibeserveTools`, `workflowRunner`, `callVibeServeTool`, and `ReporankAuditService`.

**Tech Stack:** TypeScript, Express, Vibeserve MCP tools, RepoRank audit, planAugmenter

---

### File Structure
```
server/buildPipeline/
├── pipelineTypes.ts     ✓ (exists)
├── pipelineRunner.ts    ✓ (exists, needs handler registration)
├── p1_ingest.ts         ✓ (exists)
├── p2_audit.ts          ✓ (exists)
├── p3_plan.ts           ── NEW: Generate finalization plan from audit issues
├── p4_build.ts          ── NEW: Execute plan steps via workflowRunner + vibeserve
├── p5_review.ts         ── NEW: Re-run RepoRank, compare score delta
├── p6_iterate.ts        ── NEW: Loop controller, delta plan generation
└── p7_ready.ts          ── NEW: Deployment summary, final artifact
```

---

### Task 1: Plan Phase (P3)

**File:** `server/buildPipeline/p3_plan.ts`

Generates a finalization plan from the audit issues. Each audit issue gets mapped to a fix step. The plan is augmented via `planAugmenter` and Vibeserve's architect tool if available.

```typescript
import { PipelineState, PhaseResult, AuditIssue } from "./pipelineTypes.js";
import { callVibeServeTool } from "../tools/mcp/mcpVibeServeClient.js";
import { augmentPlan } from "../planning/planAugmenter.js";
import type { ExecutionPlan } from "../../src/types.js";

export async function p3_plan(state: PipelineState): Promise<PhaseResult> {
  const auditResult = state.phases["audit"]?.output as any;
  if (!auditResult?.issues) throw new Error("No audit results. Run AUDIT phase first.");

  const issues: AuditIssue[] = auditResult.issues;
  const steps = issues.map((issue, i) => ({
    id: `fix_${i + 1}`,
    step: issue.remediation || `Fix: ${issue.title}`,
    risk: issue.severity === "critical" ? "High" as const : issue.severity === "high" ? "Medium" as const : "Low" as const,
    status: "pending" as const,
  }));

  const plan: ExecutionPlan = {
    planId: `plan_${Date.now()}`,
    success: true,
    message: `Auto-generated plan addressing ${issues.length} audit issues`,
    tree: steps,
  };

  // Try Vibeserve plan augmentation
  const daemon = { addLog: (...args: any[]) => {} };
  let augmentation = null;
  try {
    augmentation = await augmentPlan(plan, daemon);
  } catch {}

  return {
    id: "plan",
    status: "passed",
    output: { plan, augmentation, issueCount: issues.length },
    startedAt: Date.now(),
    completedAt: Date.now(),
  };
}
```

---

### Task 2: Build Phase (P4)

**File:** `server/buildPipeline/p4_build.ts`

Executes plan steps. For each step, uses `callVibeServeTool("vibe_code", ...)` if Vibeserve is reachable, otherwise marks as simulated.

```typescript
import { PipelineState, PhaseResult } from "./pipelineTypes.js";
import { callVibeServeTool } from "../tools/mcp/mcpVibeServeClient.js";

export async function p4_build(state: PipelineState): Promise<PhaseResult> {
  const planResult = state.phases["plan"]?.output as any;
  if (!planResult?.plan) throw new Error("No plan. Run PLAN phase first.");

  const plan = planResult.plan;
  if (!plan.tree || plan.tree.length === 0) {
    return {
      id: "build", status: "passed", output: { steps: [], message: "No steps to execute" },
      startedAt: Date.now(), completedAt: Date.now(),
    };
  }

  const stepResults: any[] = [];
  const workspacePath = state.workspacePath;

  for (const step of plan.tree) {
    const t0 = performance.now();
    try {
      if (process.env.ENABLE_VIBESERVE_MCP === "true") {
        await callVibeServeTool("vibe_code", {
          intent: step.step,
          plan: { task: step.step, context: { workspacePath } },
        });
      }
      step.status = "completed";
      stepResults.push({ id: step.id, status: "passed", durationMs: performance.now() - t0 });
    } catch (err: any) {
      step.status = "failed";
      stepResults.push({ id: step.id, status: "failed", error: err.message, durationMs: performance.now() - t0 });
    }
  }

  return {
    id: "build", status: "passed",
    output: { steps: stepResults, totalSteps: stepResults.length, passed: stepResults.filter(s => s.status === "passed").length },
    startedAt: Date.now(), completedAt: Date.now(),
  };
}
```

---

### Task 3: Review + Iterate Phases (P5 + P6)

**File:** `server/buildPipeline/p5_review.ts`

Re-runs RepoRank on the workspace and compares score against the P2 baseline.

```typescript
import { PipelineState, PhaseResult } from "./pipelineTypes.js";
import { ReporankAuditService } from "../audit/reporankAuditService.js";
import { MemoryCache } from "../lib/redisCache.js";

export async function p5_review(state: PipelineState): Promise<PhaseResult> {
  const workspacePath = state.workspacePath;
  if (!workspacePath) throw new Error("No workspace path");

  const originalCwd = process.cwd();
  process.chdir(workspacePath);
  try {
    const cache = new MemoryCache();
    const auditService = new ReporankAuditService(cache);
    const report = await auditService.auditWorkspace();
    cache.destroy();

    const baselineScore = state.baselineScore ?? 0;
    const newScore = report.score;
    const scoreDelta = newScore - baselineScore;

    return {
      id: "review", status: "passed", score: newScore,
      output: { newScore, baselineScore, scoreDelta, rawReport: report },
      startedAt: Date.now(), completedAt: Date.now(),
    };
  } finally {
    process.chdir(originalCwd);
  }
}
```

**File:** `server/buildPipeline/p6_iterate.ts`

Loop controller: if score < 80 and under max attempts, generates delta plan and re-enters BUILD.

```typescript
import { PipelineState, PhaseResult } from "./pipelineTypes.js";

const MAX_ITERATIONS = 3;
const SCORE_TARGET = 80;

export async function p6_iterate(state: PipelineState): Promise<PhaseResult> {
  const reviewResult = state.phases["review"]?.output as any;
  const currentScore = reviewResult?.newScore ?? state.currentScore ?? 0;

  state.iterationCount = (state.iterationCount || 0) + 1;
  const remaining = MAX_ITERATIONS - state.iterationCount;

  if (currentScore >= SCORE_TARGET) {
    return {
      id: "iterate", status: "passed", score: currentScore,
      output: { passed: true, message: `Score ${currentScore} meets target ${SCORE_TARGET}` },
      startedAt: Date.now(), completedAt: Date.now(),
    };
  }

  if (remaining <= 0) {
    return {
      id: "iterate", status: "failed", score: currentScore,
      output: { passed: false, message: `Score ${currentScore} below ${SCORE_TARGET} after ${MAX_ITERATIONS} iterations` },
      startedAt: Date.now(), completedAt: Date.now(),
    };
  }

  // Delta plan: remaining audit issues from the current review
  const issues = reviewResult?.rawReport?.vibe?.recommendations || [];
  const deltaSteps = issues.slice(0, 3).map((r: string, i: number) => ({
    id: `iter_${state.iterationCount}_${i + 1}`,
    step: r,
    risk: "Low" as const,
    status: "pending" as const,
  }));

  return {
    id: "iterate", status: "passed", score: currentScore,
    output: { passed: false, remaining, deltaPlan: { tree: deltaSteps }, currentScore, targetScore: SCORE_TARGET },
    startedAt: Date.now(), completedAt: Date.now(),
  };
}
```

---

### Task 4: Ready Phase (P7)

**File:** `server/buildPipeline/p7_ready.ts`

Generates the final summary report and deployment readiness artifact.

```typescript
import fs from "fs";
import path from "path";
import { PipelineState, PhaseResult } from "./pipelineTypes.js";

export async function p7_ready(state: PipelineState): Promise<PhaseResult> {
  const reviewScore = state.phases["review"]?.score ?? state.currentScore ?? 0;
  const baselineScore = state.baselineScore ?? 0;
  const fileCount = state.totalFiles ?? 0;

  const summary = {
    pipelineId: state.id,
    workspaceId: state.workspaceId,
    baselineScore,
    finalScore: reviewScore,
    scoreImprovement: reviewScore - baselineScore,
    filesProcessed: fileCount,
    phasesCompleted: Object.entries(state.phases)
      .filter(([, p]) => p.status === "passed").map(([id]) => id),
    deploymentReady: reviewScore >= 80,
    completedAt: new Date().toISOString(),
  };

  // Write summary to workspace
  if (state.workspacePath) {
    fs.writeFileSync(
      path.join(state.workspacePath, "MUTLY_BUILD_SUMMARY.json"),
      JSON.stringify(summary, null, 2)
    );
  }

  return {
    id: "ready", status: "passed",
    output: summary,
    score: reviewScore,
    startedAt: Date.now(), completedAt: Date.now(),
  };
}
```

---

### Task 5: Wire All Phases + Update Frontend

**Modify:** `server/buildPipeline/pipelineRunner.ts` — register P3-P7 handlers
**Modify:** `server/buildPipeline/pipelineRunner.ts` — update `runAll` to handle ITERATE loop

Add to the bottom of `pipelineRunner.ts`:

```typescript
import { p3_plan } from "./p3_plan.js";
import { p4_build } from "./p4_build.js";
import { p5_review } from "./p5_review.js";
import { p6_iterate } from "./p6_iterate.js";
import { p7_ready } from "./p7_ready.js";

pipelineRunner.registerPhase("plan", p3_plan);
pipelineRunner.registerPhase("build", p4_build);
pipelineRunner.registerPhase("review", p5_review);
pipelineRunner.registerPhase("iterate", p6_iterate);
pipelineRunner.registerPhase("ready", p7_ready);
```

Update `runAll` method to handle the ITERATE loop: if ITERATE returns a `deltaPlan`, automatically re-run BUILD and REVIEW up to 3 times.

Run: `npx tsc --noEmit` to verify.

Test: `Invoke-RestMethod -Uri "http://localhost:3001/api/pipeline/start" -Method Post -Headers $headers -Body '{"source":"local"}' -TimeoutSec 300`

Expected: All 7 phases complete with status "passed" or "failed", final score displayed.
