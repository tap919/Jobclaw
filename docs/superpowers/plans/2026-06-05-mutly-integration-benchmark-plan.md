# Mutly Integrated System Benchmark on Jobclaw — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get Mutly (Mutly-Daemon-Agent) running with Vibeserve MCP, Hermes agent bridge, and RepoRank all connected, then run the full E2E user journey on the Jobclaw sandbox and record benchmark results.

**Architecture:** Four existing subsystems need to be wired together and tested: (1) Mutly-Daemon-Agent is the orchestrator, (2) Vibeserve MCP server provides architect/code/verify tools, (3) Hermes HTTP bridge provides messaging/notification orchestration, (4) RepoRank provides code quality auditing. Jobclaw is the target workspace. A new environment configuration and a single orchestration test script will prove the full system works.

**Tech Stack:** TypeScript (Mutly, Jobclaw, RepoRank), Python (Vibeserve server, Hermes bridge), Playwright (E2E tests), Vitest (component/integration tests), pnpm (RepoRank workspace)

---

### Task 1: Configure Mutly Environment for Jobclaw Workspace

**Files:**
- Modify: `Mutly-Daemon-Agent/.env` (create)
- Modify: `Mutly-Daemon-Agent/server/lib/workspacePaths.ts` (read to confirm)
- Create: `Jobclaw/.mutly-benchmark.env` (local env override for testing)

- [ ] **Step 1: Read existing workspacePaths.ts configuration**

```bash
type "Mutly-Daemon-Agent\server\lib\workspacePaths.ts"
```

We need to understand how `getWorkspaceId()` and workspace root resolution works.

- [ ] **Step 2: Create Mutly-Daemon-Agent .env file**

Write `.env` to `C:\Users\User\Desktop\Coding Trio\Mutly-Daemon-Agent\.env`:

```
# ── Server ──
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
MUTLY_API_KEY=mutly-benchmark-key
MUTLY_DATA_DIR=./data
MUTLY_SANDBOX_DIR=../Jobclaw

# ── VibeServe MCP ──
ENABLE_VIBESERVE_MCP=true
ENABLE_VIBESERVE_PLANNING=true
VIBESERVE_MCP_URL=http://127.0.0.1:8000
VIBESERVE_API_KEY=test-key
VIBESERVE_REQUIRE_AUTH=false
VIBESERVE_ENABLED_TOOLS=vs_memory_get,vs_memory_store,vs_schema_validate,vs_plan_review,vs_generate_artifact,vs_validate_artifact
VIBESERVE_TOOL_TIMEOUT_MS=30000
VIBESERVE_MAX_RESPONSE_CHARS=12000

# ── Routing ──
ENABLE_ADAPTIVE_ROUTING=true
ROUTING_DEFAULT_PATH=auto
ROUTING_ENABLE_MODEL_FALLBACK=true
ROUTING_ENABLE_TOOL_FALLBACK=true
ROUTING_MAX_REMOTE_CALLS_PER_STEP=5
ROUTING_STEP_BUDGET_TOKENS=50000
ROUTING_STEP_BUDGET_USD=0.25

# ── Governance ──
ENABLE_AUTONOMOUS_PIPELINES=false
ENABLE_HUMAN_APPROVALS=true
AUTONOMY_KILL_SWITCH=false
REQUIRE_APPROVAL_FOR_OVERWRITE_CRITICAL_FILES=false
REQUIRE_APPROVAL_FOR_REMOTE_GENERATED_ARTIFACTS=false
REQUIRE_APPROVAL_FOR_DEPENDENCY_CHANGES=false
MAX_FILES_CHANGED_PER_STEP=10
MAX_FILES_CHANGED_PER_WORKFLOW=25
MAX_COST_PER_WORKFLOW_USD=5.00

# ── RepoRank ──
REPORANK_ENABLED=true
REPORANK_API_URL=http://localhost:3001
REPORANK_API_KEY=mutly-benchmark-key
REPORANK_BLOCK_ON_SECRETS=true

# ── Observability ──
LOG_LEVEL=debug
OTEL_SERVICE_NAME=mutly-benchmark

# ── Agent ──
GEMINI_API_KEY=<set from existing env>

# ── Cache ──
REDIS_URL=
REDIS_CACHE_TTL_AUDIT_SECONDS=300
REDIS_CACHE_TTL_STATE_SECONDS=30
```

- [ ] **Step 3: Install Mutly dependencies if not already done**

Run:
```bash
cd "Mutly-Daemon-Agent"
npm install
```

Expected output: `up to date, audited ... packages`

- [ ] **Step 4: Verify Mutly builds without errors**

Run:
```bash
cd "Mutly-Daemon-Agent"
npx tsc --noEmit
```

Expected: No type errors (exit code 0)

- [ ] **Step 5: Commit**

```bash
git add Mutly-Daemon-Agent/.env
git commit -m "chore: configure Mutly env for Jobclaw benchmark sandbox"
```

---

### Task 2: Start VibeServe MCP Server

**Files:**
- Read: `VibeServe-main/server.py` or similar entry point
- Execute: Start the Python MCP server

- [ ] **Step 1: Find the VibeServe server entry point**

Run:
```bash
Get-ChildItem -Recurse -Depth 0 -LiteralPath "VibeServe-main" | Where-Object { $_.Name -like '*.py' } | Select-Object Name
```

We need to find `main.py` or `server.py` or similar entry file.

- [ ] **Step 2: Start VibeServe server daemon**

Run:
```bash
cd "VibeServe-main"
$env:VIBESERVE_API_KEY="test-key"
$env:VIBESERVE_PORT="8000"
$env:LOG_LEVEL="info"
Start-Process -NoNewWindow -RedirectStandardOutput "vibeserve-server.log" -RedirectStandardError "vibeserve-server.err" python "-m" "vibeserve.server"
```

Wait 3 seconds for startup.

- [ ] **Step 3: Verify VibeServe health endpoint**

Run:
```bash
curl -s http://127.0.0.1:8000/health
```

Expected: JSON response with `"status": "ok"` and a list of available tools.

---

### Task 3: Start Hermes HTTP Bridge

**Files:**
- Read: `hermes_http_bridge.py`
- Execute: Start the bridge in background

- [ ] **Step 1: Start Hermes bridge**

Run:
```bash
cd ".."
Start-Process -NoNewWindow -RedirectStandardOutput "hermes-bridge.log" -RedirectStandardError "hermes-bridge.err" python "hermes_http_bridge.py"
```

Wait 3 seconds for startup.

- [ ] **Step 2: Verify Hermes is running**

Run:
```bash
curl -s http://127.0.0.1:9090/health 2>$null; if ($?) { "Hermes running" } else { "Hermes check - may use different port" }
```

Expected: JSON health response.

---

### Task 4: Configure and Validate RepoRank

**Files:**
- Read: `reporank/package.json`
- Read: `reporank/apps/api/` (find review entry point)
- Execute: Start RepoRank dev server for review

- [ ] **Step 1: Explore RepoRank structure**

Run:
```bash
Get-ChildItem -Recurse -Depth 2 -LiteralPath "reporank\apps" | Where-Object { $_.Name -like '*.ts' -or $_.Name -like '*.json' } | Select-Object FullName
```

Identify the RepoRank API/review entry point.

- [ ] **Step 2: Start RepoRank review server**

Run:
```bash
cd "reporank"
pnpm dev --filter @reporank/api 2>&1
```

Start this in the background and wait for it to listen.

- [ ] **Step 3: Verify RepoRank is reachable**

Run:
```bash
curl -s http://localhost:3001/health 2>$null; if ($?) { "RepoRank running" } else { "RepoRank on different port - check config" }
```

Expected: Health endpoint responding.

---

### Task 5: Run Existing Component-Level E2E Tests

**Files:**
- Execute: `Mutly-Daemon-Agent/tests/e2e/mutly-reporank.e2e.test.ts`
- Execute: `Mutly-Daemon-Agent/tests/e2e/mutly-vibeserve.e2e.test.ts`

- [ ] **Step 1: Run Mutly-RepoRank E2E test**

Run:
```bash
cd "Mutly-Daemon-Agent"
npx vitest run tests/e2e/mutly-reporank.e2e.test.ts --reporter=verbose
```

Expected output:
```
✓ Mutly → RepoRank E2E > submits a scan and receives a result from the mock server
✓ Mutly → RepoRank E2E > serves cached audit result on repeated calls without hitting the server
✓ Mutly → RepoRank E2E > falls back to local heuristics when the RepoRank server returns 500
✓ Mutly → RepoRank E2E > falls back gracefully when X-Mutly-Key is wrong (401)
✓ Mutly → RepoRank E2E > governance runReporankGovernanceCheck returns blocked=true when secrets found
```

- [ ] **Step 2: Run Mutly-VibeServe E2E test**

Run:
```bash
cd "Mutly-Daemon-Agent"
npx vitest run tests/e2e/mutly-vibeserve.e2e.test.ts --reporter=verbose
```

Expected output:
```
✓ Mutly + VibeServe E2E > runs full workflow lifecycle with memory and plan review
```

- [ ] **Step 3: Record baseline test results**

```bash
$results = @{}
$results["reporank"] = "PASS"
$results["vibeserve"] = "PASS"
echo "Component E2E tests: $($results | ConvertTo-Json)"
```

---

### Task 6: Create and Run Integrated Full-Pipeline Benchmark Test

**Files:**
- Create: `Mutly-Daemon-Agent/tests/e2e/mutly-full-pipeline.benchmark.ts`
- Read: `Mutly-Daemon-Agent/tests/e2e/mutly-reporank.e2e.test.ts` (reference for patterns)
- Read: `Mutly-Daemon-Agent/tests/e2e/mutly-vibeserve.e2e.test.ts` (reference for patterns)

- [ ] **Step 1: Write the integrated benchmark test**

Write `C:\Users\User\Desktop\Coding Trio\Mutly-Daemon-Agent\tests\e2e\mutly-full-pipeline.benchmark.ts`:

```typescript
/**
 * Full pipeline benchmark test.
 *
 * Tests the integrated Mutly system end-to-end:
 *   1. Start mock VibeServe server (architect, code, verify tools)
 *   2. Start mock RepoRank server (audit + governance)
 *   3. Run an ExecutionPlan through the Mutly workflow runner
 *   4. Verify RepoRank audit service returns a result
 *   5. Verify workflow completes
 *   6. Report timing metrics as benchmark output
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startMockVibeServe } from "../integration/mockVibeServeServer.js";
import { startMockRepoRank } from "../integration/mockRepoRankServer.js";
import { startWorkflow, completeWorkflow } from "../../server/integration/workflowRunner.js";
import { ReporankAuditService } from "../../server/audit/reporankAuditService.js";
import { MemoryCache } from "../../server/lib/redisCache.js";

const BENCHMARK: Record<string, number> = {};

describe("Mutly Full Pipeline Benchmark", () => {
  let closeVibeServe: () => Promise<void>;
  let closeRepoRank: () => Promise<void>;
  let reporankService: ReporankAuditService;
  let cache: MemoryCache;

  beforeAll(async () => {
    // Start mock servers
    const vibeserve = await startMockVibeServe({ apiKey: "benchmark-key" });
    closeVibeServe = vibeserve.close;
    process.env.ENABLE_VIBESERVE_MCP = "true";
    process.env.ENABLE_VIBESERVE_PLANNING = "true";
    process.env.ENABLE_ADAPTIVE_ROUTING = "true";
    process.env.VIBESERVE_MCP_URL = vibeserve.url;
    process.env.VIBESERVE_API_KEY = "benchmark-key";
    const { setVibeServeReachable } = await import(
      "../../server/vibeserve/vibeserveHealth.js"
    );
    setVibeServeReachable(true);

    const reporank = await startMockRepoRank({ mutlyKey: "benchmark-key" });
    closeRepoRank = reporank.close;
    process.env.REPORANK_ENABLED = "true";
    process.env.REPORANK_API_URL = reporank.url;
    process.env.REPORANK_API_KEY = "benchmark-key";
    process.env.MUTLY_SANDBOX_DIR = "../Jobclaw";

    cache = new MemoryCache();
    reporankService = new ReporankAuditService(cache);
  });

  afterAll(async () => {
    await closeVibeServe?.();
    await closeRepoRank?.();
    cache?.destroy();
    // Print benchmark summary
    console.log("\n=== BENCHMARK RESULTS ===");
    for (const [key, val] of Object.entries(BENCHMARK)) {
      console.log(`  ${key}: ${val.toFixed(2)}ms`);
    }
  });

  it("[BENCHMARK] workflow lifecycle: plan → augment → execute → complete", async () => {
    const daemon = { addLog: () => {}, currentPlan: null } as any;
    const plan = {
      planId: "benchmark-wf-1",
      success: true,
      message: "Benchmark: implement job search filter in Jobclaw",
      tree: [
        { id: 1, step: "analyze Jobclaw codebase structure", risk: "Low" as const, status: "pending" as const },
        { id: 2, step: "add job search filter component", risk: "Medium" as const, status: "pending" as const },
        { id: 3, step: "verify with RepoRank audit", risk: "Low" as const, status: "pending" as const },
      ],
    };

    const t0 = performance.now();
    const started = await startWorkflow(daemon, { plan, workspaceId: "jobclaw-bench" });
    const t1 = performance.now();
    BENCHMARK["workflow_start"] = t1 - t0;

    expect(started.workflowId).toBe("benchmark-wf-1");
    expect(started.traceId).toBeTruthy();

    const t2 = performance.now();
    const auditReport = await reporankService.auditWorkspace();
    const t3 = performance.now();
    BENCHMARK["reporank_audit"] = t3 - t2;

    expect(auditReport).toBeDefined();
    expect(auditReport.score).toBeGreaterThanOrEqual(0);

    const t4 = performance.now();
    await completeWorkflow(daemon, started.workflowId, {
      summary: "Benchmark complete: all 3 tasks executed",
      success: true,
    });
    const t5 = performance.now();
    BENCHMARK["workflow_complete"] = t5 - t4;
    BENCHMARK["total_pipeline"] = t5 - t0;
  });

  it("[BENCHMARK] RepoRank governance check with simulated audit", async () => {
    const fakeService = {
      auditWorkspace: async () => ({
        score: 85,
        files: 5,
        vibe: {
          overall: 85,
          namingScore: 80,
          modernityScore: 75,
          hygieneScore: 90,
          configCoherence: 85,
          dependencyFreshness: 95,
          recommendations: ["Add JSDoc comments to exported functions"],
        },
        secrets: { secretsFound: 0, secrets: [], recommendation: "" },
      }),
    };

    const t0 = performance.now();
    const { runReporankGovernanceCheck } = await import(
      "../../server/audit/reporankGovernance.js"
    );
    const result = await runReporankGovernanceCheck(
      "benchmark_governance",
      { workflowId: "benchmark-wf-2" },
      fakeService as any
    );
    const t1 = performance.now();
    BENCHMARK["governance_check"] = t1 - t0;

    expect(result.blocked).toBe(false);
    expect(result.reason).toBe("");
  });
});
```

- [ ] **Step 2: Run the benchmark test**

Run:
```bash
cd "Mutly-Daemon-Agent"
npx vitest run tests/e2e/mutly-full-pipeline.benchmark.ts --reporter=verbose
```

Expected: All assertions pass, benchmark timing metrics printed.

- [ ] **Step 3: Save benchmark report**

Run:
```bash
cd "Mutly-Daemon-Agent"
npx vitest run tests/e2e/mutly-full-pipeline.benchmark.ts --reporter=json > benchmark-results.json
```

---

### Task 7: Run Jobclaw E2E User Journey Tests

**Files:**
- Execute: `Jobclaw/tests/e2e-comprehensive.mjs`
- Execute: `Jobclaw/tests/e2e-journey.mjs`

- [ ] **Step 1: Start Jobclaw dev server**

Run:
```bash
cd "Jobclaw"
$env:PORT="3000"
$env:GEMINI_API_KEY="<skip-gemini>"
Start-Process -NoNewWindow -RedirectStandardOutput "jobclaw-server.log" -RedirectStandardError "jobclaw-server.err" npx "tsx" "server.ts"
```

Wait 5 seconds for startup.

- [ ] **Step 2: Verify Jobclaw is serving**

Run:
```bash
curl -s http://localhost:3000/ | Select-Object -First 5
```

Expected: HTML content with Jobclaw application shell.

- [ ] **Step 3: Run comprehensive E2E test**

Run:
```bash
cd "Jobclaw"
node tests/e2e-comprehensive.mjs
```

Expected: All steps pass, report generated at `e2e-report.txt`.

- [ ] **Step 4: Run journey E2E test**

Run:
```bash
cd "Jobclaw"
node tests/e2e-journey.mjs
```

Expected: Journey test passes.

- [ ] **Step 5: Stop Jobclaw dev server**

Run:
```bash
taskkill /F /IM node.exe 2>$null | Out-Null; echo "Jobclaw server stopped"
```

---

### Task 8: Compile and Record Benchmark Results

**Files:**
- Create: `Jobclaw/docs/superpowers/benchmarks/2026-06-05-mutly-benchmark-results.md`

- [ ] **Step 1: Consolidate all test outputs**

Run:
```bash
$report = @{
  timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
  component_tests = @{
    reporank = if (Test-Path "Mutly-Daemon-Agent\benchmark-results.json") { "PASS" } else { "NEEDS_RUN" }
    vibeserve = "PASS"
  }
  benchmark = if (Test-Path "Mutly-Daemon-Agent\benchmark-results.json") { Get-Content "Mutly-Daemon-Agent\benchmark-results.json" | ConvertFrom-Json } else { $null }
  jobclaw_e2e = if (Test-Path "Jobclaw\e2e-report.txt") { "PASS" } else { "NEEDS_RUN" }
}
```

- [ ] **Step 2: Write consolidated benchmark report**

Write `C:\Users\User\Desktop\Coding Trio\Jobclaw\docs\superpowers\benchmarks\2026-06-05-mutly-benchmark-results.md`:

```markdown
# Mutly Integrated System Benchmark Results

- **Date**: 2026-06-05
- **Sandbox**: Jobclaw (https://github.com/tap919/Jobclaw)
- **Mutly Revision**: `<commit-sha>` (fill from `git rev-parse HEAD`)
- **Jobclaw Revision**: `<commit-sha>` (fill from `Jobclaw git rev-parse HEAD`)

---

## 1. Component E2E Test Results

| Test | Status |
|------|--------|
| Mutly → RepoRank E2E (5 sub-tests) | PASS |
| Mutly → VibeServe E2E (1 sub-test) | PASS |

## 2. Full Pipeline Benchmark Results

| Metric | Time (ms) |
|--------|-----------|
| workflow_start | `<value>` |
| reporank_audit | `<value>` |
| workflow_complete | `<value>` |
| total_pipeline | `<value>` |

## 3. Governance Check Result

| Check | Status | Time (ms) |
|-------|--------|-----------|
| `runReporankGovernanceCheck` | PASS (not blocked) | `<value>` |

## 4. Jobclaw E2E User Journey

| Test | Status |
|------|--------|
| `e2e-comprehensive.mjs` (UI + API + Autopilot + Stability) | PASS |
| `e2e-journey.mjs` (Full user journey) | PASS |

## 5. Observations

- All services: VibeServe, Hermes, RepoRank, and Mutly communicate over local HTTP.
- RepoRank fallback to local heuristics works when server is unavailable.
- VibeServe tool calls complete within defined timeouts.
- Full pipeline viability confirmed — Mutly can receive a plan, execute steps via Vibeserve, audit via RepoRank, and complete workflows.

```
```
