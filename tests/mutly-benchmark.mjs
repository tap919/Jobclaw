/**
 * Full Mutly pipeline benchmark on Jobclaw.
 *
 * Triggers the full pipeline (ingest → audit → plan → build → review)
 * via the Mutly API. Captures RepoRank grades at each phase,
 * VibeServe tool invocations, and final pipeline metrics.
 */
import { chromium } from "playwright";
import { spawn } from "child_process";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MUTLY_DIR = resolve(__dirname, "..", "..", "Mutly-Daemon-Agent");
const JOBCLAW_DIR = resolve(__dirname, "..");
const BASE = "http://localhost:3000";
const REPORT = [];
let apiKey = null;
let serverProcess;

async function startMutly() {
  console.log("Starting Mutly daemon...");
  serverProcess = spawn("node", ["--import", "tsx", "server.ts"], {
    cwd: MUTLY_DIR,
    env: { ...process.env, PORT: "3000" },
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  serverProcess.stdout.on("data", d => {
    const s = d.toString();
    if (s.includes("listening") || s.includes("ready")) console.log("  [mutly]", s.trim());
  });
  serverProcess.stderr.on("data", d => {
    const s = d.toString().trim();
    if (s && !s.includes("DEP") && !s.includes("Warning") && !s.includes("Port 24678")) {
      console.log("  [mutly:err]", s.slice(0, 200));
    }
  });
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) { console.log("Mutly ready on", BASE); return; }
    } catch { /* wait */ }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("Mutly failed to start");
}

async function stopMutly() {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    await new Promise(r => setTimeout(r, 2000));
    if (!serverProcess.killed) serverProcess.kill("SIGKILL");
  }
}

async function getApiKey() {
  // The /api/agent/public-config returns the dev key hint
  const res = await fetch(`${BASE}/api/agent/public-config`);
  const body = await res.json();
  return body.devApiKeyHint || "dev_mutly_secure_master_key";
}

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", "X-Mutly-API-Key": apiKey, ...(opts.headers || {}) };
  return fetch(`${BASE}${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
}

const step = async (label, fn) => {
  try {
    console.log(`\n>>> ${label}`);
    REPORT.push(`\n## ${label}`);
    const result = await fn();
    if (result) REPORT.push(result);
    console.log("  ✓");
  } catch (e) {
    REPORT.push(`  ERROR: ${e.message}`);
    console.log("  ✗", e.message);
  }
};

try {
  await startMutly();
  apiKey = await getApiKey();
  console.log("API key acquired:", apiKey ? apiKey.slice(0, 8) + "..." : "NONE");

  // 1. Health
  await step("1. Health check", async () => {
    const res = await api("/health");
    const body = await res.json();
    return `  Status: ${body.status}\n  VibeServe reachable: ${body.vibeserveReachable}\n  Kill switch: ${body.killSwitch}`;
  });

  // 2. Check VibeServe health
  await step("2. VibeServe MCP (default component)", async () => {
    const res = await api("/api/vibeserve/health");
    if (res.ok) {
      const body = await res.json();
      return `  Reachable: ${body.reachable}\n  Tools: ${body.tools?.join(", ") || "unknown"}`;
    }
    return `  Status: ${res.status} (VibeServe endpoint not found in routes — checking via public config)`;
  });

  // 3. Check RepoRank connectivity
  await step("3. RepoRank (default component)", async () => {
    const res = await api("/api/reporank/health");
    if (res.ok) {
      const body = await res.json();
      return `  Status: ${JSON.stringify(body)}`;
    }
    return `  Status: ${res.status} (RepoRank endpoint not found)`;
  });

  // 4. Configure Mutly to use Jobclaw as the source
  await step("4. Configure workspace = Jobclaw repo", async () => {
    // Use settings API to point the workspace to Jobclaw
    const res = await api("/api/settings/config", {
      method: "PUT",
      body: JSON.stringify({
        features: { main_agent_enabled: true, adaptive_routing: false, autonomous_pipelines: true, human_approvals: false, autonomy_kill_switch: false },
        agent: { mode: "auto", max_concurrent_sub_agents: 4, memory_backend: "redis", soul_file: "mutly.soul.md", heartbeat_file: "mutly.heartbeat.json", heartbeat_interval_seconds: 30 },
        integrations: { vibeserve: { enabled: true, url: "http://127.0.0.1:8000", tool_timeout_ms: 10000, max_retries: 3 }, reporank: { enabled: true, url: "http://localhost:3001" }, google_ax: { enabled: false, endpoint: "", project: "" } },
        pipeline: { drift_threshold: 0.3, review_threshold: 0.4, approval_policy: { require_for: [] }, default_template: "build" },
        sub_agents: { token_budget: 8000, scope_boundary: "src/", audit_trail: true, timeout_ms: 120000 },
      }),
    });
    return `  Config saved: ${res.status}`;
  });

  // 5. Trigger full pipeline run on Jobclaw
  let pipelineResult = null;
  await step("5. Run full pipeline on Jobclaw", async () => {
    const t0 = Date.now();
    const res = await api("/api/agent/run-all-steps", {
      method: "POST",
      body: JSON.stringify({
        workspaceRoot: JOBCLAW_DIR,
        message: "Analyze and improve the Jobclaw codebase using RepoRank and VibeServe",
      }),
    });
    const dt = Date.now() - t0;
    if (res.ok) {
      const body = await res.json();
      pipelineResult = body;
      return `  Duration: ${dt}ms\n  Status: ${res.status}\n  Pipeline state: ${body?.loop?.state || "unknown"}`;
    }
    return `  Status: ${res.status}\n  Duration: ${dt}ms`;
  });

  // 6. Get the pipeline state with all RepoRank grades
  await step("6. Pipeline state + RepoRank grades", async () => {
    const res = await api("/api/agent/status");
    if (res.ok) {
      const body = await res.json();
      // Try to find the most recent pipeline run
      const r = body.pipelineRuns?.[0] || body.recentRuns?.[0] || body;
      const lines = [];
      lines.push(`  Daemon: ${body.status?.daemon || "unknown"}`);
      lines.push(`  Phase: ${body.status?.currentPhase || "unknown"}`);
      if (r.reporankGrades) {
        lines.push(`  RepoRank Grades:`);
        for (const [phase, grade] of Object.entries(r.reporankGrades)) {
          if (grade?.score !== null && grade?.score !== undefined) {
            lines.push(`    ${phase}: ${grade.score} (${grade.gradeCategory || ""}) — ${grade.summary?.slice(0, 80) || ""}`);
          } else {
            lines.push(`    ${phase}: [error] ${grade?.error || "no result"}`);
          }
        }
      }
      lines.push(`  Drift: ${r.drift?.level || "?"} (max ${r.drift?.max || "?"})`);
      lines.push(`  Profile: ${r.profile || "?"}`);
      lines.push(`  Commits: ${r.commits?.length || 0}`);
      return lines.join("\n");
    }
    return `  Status: ${res.status}`;
  });

  // 7. Now do a fresh pipeline run via the orchestrator API (runPipeline)
  await step("7. Run full orchestrator pipeline (ingest→audit→plan→build→review)", async () => {
    // Use the pipeline runner directly via /api/agent/run-all-steps or /api/build/run
    const t0 = Date.now();
    const res = await api("/api/build/run", {
      method: "POST",
      body: JSON.stringify({
        workspaceRoot: JOBCLAW_DIR,
        prePlan: undefined,
      }),
    });
    const dt = Date.now() - t0;
    if (res.ok) {
      const body = await res.json();
      const lines = [`  Duration: ${dt}ms`, `  Status: ${res.status}`];
      if (body.reporankGrades) {
        lines.push(`  RepoRank Grades (4-phase):`);
        for (const [phase, grade] of Object.entries(body.reporankGrades)) {
          if (grade?.error) {
            lines.push(`    ${phase}: [error] ${grade.error}`);
          } else if (grade?.score !== null && grade?.score !== undefined) {
            lines.push(`    ${phase}: ${grade.score} (${grade.gradeCategory || ""}) — ${grade.summary?.slice(0, 100) || ""}`);
            if (grade.findings?.length > 0) {
              lines.push(`      findings: ${grade.findings.slice(0, 3).map(f => `[${f.severity}] ${f.title}`).join("; ")}`);
            }
          }
        }
      }
      lines.push(`  Drift: ${body.drift?.level || "?"}`);
      lines.push(`  Commits: ${body.commits?.length || 0}`);
      return lines.join("\n");
    }
    return `  Status: ${res.status} Duration: ${dt}ms`;
  });

  // 8. Take Playwright screenshots of the running pipeline
  await step("8. Playwright screenshots of pipeline run", async () => {
    const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    // Get the API key into the page so the SPA can call /api/*
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
    const enterBtn = page.locator("button, a").filter({ hasText: /Enter|Get Started/i }).first();
    if ((await enterBtn.count()) > 0) await enterBtn.click().catch(() => {});
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(JOBCLAW_DIR, "benchmark-01-dashboard.png"), fullPage: true });
    // Source Import tab
    const importTab = page.locator("nav, aside").locator("text=Source Import").first();
    if ((await importTab.count()) > 0) await importTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(JOBCLAW_DIR, "benchmark-02-source-import.png"), fullPage: true });
    // Build Pipeline tab
    const buildTab = page.locator("nav, aside").locator("text=Build Pipeline").first();
    if ((await buildTab.count()) > 0) await buildTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(JOBCLAW_DIR, "benchmark-03-build-pipeline.png"), fullPage: true });
    // Settings tab
    const settingsTab = page.locator("nav, aside").locator("text=Settings").first();
    if ((await settingsTab.count()) > 0) await settingsTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(JOBCLAW_DIR, "benchmark-04-settings.png"), fullPage: true });
    // Daemon status
    const daemonTab = page.locator("nav, aside").locator("text=Mutly Daemon").first();
    if ((await daemonTab.count()) > 0) await daemonTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(JOBCLAW_DIR, "benchmark-05-daemon.png"), fullPage: true });
    await browser.close();
    return `  5 screenshots saved to ${JOBCLAW_DIR}`;
  });

  // 9. Jobclaw repo health check via settings (RepoRank baseline)
  await step("9. RepoRank baseline grade on Jobclaw", async () => {
    // Hit the audit endpoint to trigger a fresh RepoRank scan
    const res = await api("/api/agent/audit", {
      method: "POST",
      body: JSON.stringify({ workspaceRoot: JOBCLAW_DIR }),
    });
    if (res.ok) {
      const body = await res.json();
      const lines = [`  Status: ${res.status}`];
      if (body.audit?.score !== undefined) {
        lines.push(`  Audit score: ${body.audit.score}`);
        lines.push(`  Vibe analysis: ${JSON.stringify(body.audit.vibe || {})}`);
        if (body.audit.reporankApiResult) {
          lines.push(`  RepoRank overall: ${body.audit.reporankApiResult.overallScore}`);
          lines.push(`  RepoRank grade: ${body.audit.reporankApiResult.gradeCategory} (${body.audit.reporankApiResult.maturityLevel})`);
          lines.push(`  Findings: ${body.audit.reporankApiResult.findings?.length || 0}`);
        }
      }
      return lines.join("\n");
    }
    return `  Status: ${res.status}`;
  });

  writeFileSync(join(JOBCLAW_DIR, "benchmark-report.txt"), REPORT.join("\n"));
  console.log("\n=== Benchmark complete. Report at benchmark-report.txt ===");
} catch (e) {
  console.error("FATAL:", e);
  REPORT.push(`\nFATAL: ${e.message}`);
  writeFileSync(join(JOBCLAW_DIR, "benchmark-report.txt"), REPORT.join("\n"));
} finally {
  await stopMutly();
}
