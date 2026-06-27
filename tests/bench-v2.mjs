/**
 * Rapid benchmark — triggers pipeline + captures RepoRank grades.
 */
import { spawn } from "child_process";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MUTLY_DIR = resolve(__dirname, "..", "..", "Mutly-Daemon-Agent");
const JOBCLAW_DIR = resolve(__dirname, "..");
const BASE = "http://localhost:3000";
const REPORT = [];
let apiKey, serverProcess;

async function startMutly() {
  console.log("Starting Mutly...");
  serverProcess = spawn("node", ["--import", "tsx", "server.ts"], {
    cwd: MUTLY_DIR, env: { ...process.env, PORT: "3000" }, stdio: ["ignore", "pipe", "pipe"], shell: true,
  });
  serverProcess.stderr.on("data", d => {
    const s = d.toString().trim();
    if (s && !s.includes("DEP") && !s.includes("Warning") && !s.includes("Port 24678")) console.log("  [err]", s.slice(0,150));
  });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${BASE}/health`); if (r.ok) { console.log("Mutly ready"); return; } } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("Mutly failed to start");
}
async function stopMutly() { if (serverProcess) { serverProcess.kill("SIGTERM"); await new Promise(r => setTimeout(r, 2000)); } }

async function step(label, fn) {
  const t0 = Date.now();
  try {
    const r = await fn();
    const dt = Date.now() - t0;
    REPORT.push(`\n## ${label} (${dt}ms)`);
    if (typeof r === "string") REPORT.push(r);
    else if (r) REPORT.push(JSON.stringify(r, null, 2).slice(0, 500));
    console.log(`  ✓ ${label} (${dt}ms)`);
  } catch (e) {
    REPORT.push(`  ✗ ${e.message}`);
    console.log(`  ✗ ${e.message}`);
  }
}

try {
  await startMutly();
  apiKey = (await (await fetch(`${BASE}/api/agent/public-config`)).json()).devApiKeyHint || "dev_mutly_secure_master_key";
  console.log("Key:", apiKey?.slice(0,10));
  const h = { "Content-Type": "application/json", "X-Mutly-API-Key": apiKey };

  await step("Health", async () => (await fetch(`${BASE}/health`)).status.toString());
  await step("Agent status", async () => {
    const r = await fetch(`${BASE}/api/agent/status`, { headers: h });
    if (!r.ok) return `Status: ${r.status}`;
    const b = await r.json();
    return `Daemon: ${b.status?.daemon}\nPhase: ${b.status?.currentPhase}\nVibeServe: ${b.status?.vibeserveEnabled}`;
  });
  await step("Settings (merged config)", async () => {
    const r = await fetch(`${BASE}/api/settings`, { headers: h });
    if (!r.ok) return `Status: ${r.status}`;
    const b = await r.json();
    return `Main agent: ${b.config?.features?.main_agent_enabled}\nSoul: ${b.soul?.name}\nErrors: ${b.errors?.length}`;
  });

  // Trigger pipeline
  let pipelineResult;
  await step("Pipeline run on Jobclaw", async () => {
    const t0 = Date.now();
    const r = await fetch(`${BASE}/api/agent/run-all-steps`, {
      method: "POST", headers: h,
      body: JSON.stringify({ workspaceRoot: JOBCLAW_DIR, message: "Audit and improve Jobclaw" }),
    });
    const dt = Date.now() - t0;
    if (r.ok) pipelineResult = await r.json();
    return `Status: ${r.status}\nDuration: ${dt}ms\nPipeline: ${pipelineResult?.loop?.state || "N/A"}`;
  });

  // RepoRank
  await step("RepoRank audit on Jobclaw", async () => {
    const r = await fetch(`${BASE}/api/agent/audit`, {
      method: "POST", headers: h,
      body: JSON.stringify({ workspaceRoot: JOBCLAW_DIR }),
    });
    if (!r.ok) return `Status: ${r.status}`;
    const b = await r.json();
    const lines = [];
    if (b.audit?.score !== undefined) lines.push(`Audit score: ${b.audit.score}`);
    if (b.audit?.reporankApiResult) {
      lines.push(`RepoRank overall: ${b.audit.reporankApiResult.overallScore}`);
      lines.push(`Grade: ${b.audit.reporankApiResult.gradeCategory} (${b.audit.reporankApiResult.maturityLevel})`);
      lines.push(`Findings: ${b.audit.reporankApiResult.findings?.length || 0}`);
    }
    lines.push(`Files scanned: ${b.audit?.files || "?"}`);
    lines.push(`Secrets found: ${b.audit?.secrets?.secretsFound || 0}`);
    return lines.join("\n");
  });

  writeFileSync(join(JOBCLAW_DIR, "benchmark-v2.txt"), REPORT.join("\n"));
  console.log("\n=== Done ===");
} catch (e) { console.error("FATAL:", e); } finally { await stopMutly(); }
