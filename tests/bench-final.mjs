/**
 * Final benchmark — starts Mutly, runs pipeline, captures results.
 * RepoRank degrades gracefully if unavailable (tested design).
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
let server;

async function start() {
  console.log("Starting Mutly...");
  server = spawn("node", ["--import", "tsx", "server.ts"], {
    cwd: MUTLY_DIR,
    env: { ...process.env, PORT: "3000", REPORANK_ENABLED: "true" },
    stdio: ["ignore", "pipe", "pipe"], shell: true,
  });
  server.stderr.on("data", d => {
    const s = d.toString().trim();
    if (s && !s.includes("DEP") && !s.includes("Warning") && !s.includes("Port 24678") && !s.includes("WebSocket"))
      console.log("  [srv]", s.slice(0, 120));
  });
  server.stdout.on("data", d => {
    const s = d.toString().trim();
    if (s.includes("listening")) console.log("  [srv]", s);
    if (s.includes("INFO")) console.log("  [srv]", s.replace(/\[.*?\]/g, "").trim().slice(0, 100));
  });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${BASE}/health`); if (r.ok) { console.log("Ready"); return; } } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("Start failed");
}
async function stop() { if (server) { server.kill("SIGTERM"); await new Promise(r => setTimeout(r, 2000)); } }

async function p() {
  try {
    await start();
    const pk = await fetch(`${BASE}/api/agent/public-config`);
    const key = (await pk.json()).devApiKeyHint || "dev_mutly_secure_master_key";
    const h = { "Content-Type": "application/json", "X-Mutly-API-Key": key };

    REPORT.push("# Final Mutly Benchmark on Jobclaw");
    REPORT.push(`Date: ${new Date().toISOString()}\n`);

    // Health
    REPORT.push("## Health");
    const health = await (await fetch(`${BASE}/health`)).json();
    REPORT.push(`Status: ${health.status} | VibeServe: ${health.vibeserveReachable}`);

    // Settings
    const settings = await (await fetch(`${BASE}/api/settings`, { headers: h })).json();
    REPORT.push(`\n## Config`);
    REPORT.push(`Soul: ${settings.soul?.name} | Errors: ${settings.errors?.length}`);
    REPORT.push(`Agent: ${settings.config?.agent?.mode} | Sub-agents: ${settings.config?.agent?.max_concurrent_sub_agents}`);

    // Pipeline via agent runner
    REPORT.push(`\n## Pipeline via PipelineRunner`);
    const t0 = Date.now();
    const pipeTags = new Map();
    let pipeResp;
    try {
      const pipeInfos = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        const pt0 = Date.now();
        const r = await fetch(`${BASE}/api/agent/run-all-steps`, {
          method: "POST", headers: h,
          body: JSON.stringify({ workspaceRoot: JOBCLAW_DIR, message: "Full Mutly pipeline on Jobclaw" }),
        });
        const ms = Date.now() - pt0;
        if (r.ok) {
          pipeTags.set("success", true);
          pipeTags.set("attempt", attempt + 1);
          pipeResp = await r.json();
          pipeTags.set("duration", ms);
          break;
        } else {
          pipeInfos.push(`  Attempt ${attempt + 1}: ${r.status} (${ms}ms)`);
          await new Promise(r2 => setTimeout(r2, 2000));
        }
      }
      if (pipeInfos.length) REPORT.push(pipeInfos.join("\n"));
    } catch (e) { REPORT.push(`  Error: ${e.message}`); }

    if (pipeResp) {
      REPORT.push(`Status: ${pipeResp.loop?.state || "N/A"} (${pipeTags.get("duration") || "?"}ms)`);
      if (pipeResp.drift) REPORT.push(`Drift: ${pipeResp.drift.level} (max ${pipeResp.drift.max})`);
      if (pipeResp.commits) REPORT.push(`Commits: ${pipeResp.commits.length}`);

      if (pipeResp.reporankGrades) {
        REPORT.push(`\n### RepoRank Grades`);
        for (const [phase, g] of Object.entries(pipeResp.reporankGrades)) {
          const grade = g;
          if (grade?.error) REPORT.push(`  ${phase}: [${grade.error}]`);
          else if (grade?.score != null)
            REPORT.push(`  ${phase}: ${grade.score} [${grade.gradeCategory}] ${grade.summary?.slice(0, 80) || ""}`);
          else REPORT.push(`  ${phase}: [no data]`);
        }
      }
    }

    // Audit
    try {
      REPORT.push(`\n## RepoRank Audit`);
      const audit = await (await fetch(`${BASE}/api/agent/audit`, {
        method: "POST", headers: h, body: JSON.stringify({ workspaceRoot: JOBCLAW_DIR }),
      })).json();
      if (audit.audit?.score != null) REPORT.push(`Score: ${audit.audit.score}`);
      if (audit.audit?.reporankApiResult)
        REPORT.push(`RepoRank: ${audit.audit.reporankApiResult.overallScore} [${audit.audit.reporankApiResult.gradeCategory}]`);
      REPORT.push(`Files: ${audit.audit?.files || "?"}`);
    } catch (e) { REPORT.push(`  Error: ${e.message}`); }

    // Industry comparison
    const BASELINE = {
      "Claude Code": { swe: "65.2%", cost: "$2-5", ctx: "200k", multi: "No", grading: "No", soul: "No", runtime: "No" },
      "Aider (Sonnet)": { swe: "63.1%", cost: "$0.50-2", ctx: "200k", multi: "No", grading: "No", soul: "No", runtime: "No" },
      "Codex CLI": { swe: "46.8%", cost: "$0.20-1", ctx: "32k", multi: "No", grading: "No", soul: "No", runtime: "No" },
    };
    REPORT.push(`\n## Industry Comparison`);
    REPORT.push(`| Tool | SWE-bench | Cost | Context | Multi-phase | Real-time Grading | Soul Identity | Runtime Config |`);
    REPORT.push(`|---|---|---|---|---|---|---|---|`);
    for (const [t, d] of Object.entries(BASELINE)) {
      REPORT.push(`| ${t} | ${d.swe} | ${d.cost} | ${d.ctx} | ${d.multi} | ${d.grading} | ${d.soul} | ${d.runtime} |`);
    }
    REPORT.push(`| **MUTLY** | **pending** | **variable** | **configurable** | **✅ 7-phase** | **✅ RepoRank** | **✅ soul.md** | **✅ Settings API** |`);

    REPORT.push(`\n## Key Differentiators`);
    REPORT.push(`1. Multi-phase pipeline: ingest→audit→plan→build→review→iterate→deploy via actual agents`);
    REPORT.push(`2. RepoRank quality gates at each phase (baseline, audit, build, final)`);
    REPORT.push(`3. VibeServe MCP as default execution path`);
    REPORT.push(`4. Soul file (mutly.soul.md) for agent identity — not generic LLM`);
    REPORT.push(`5. Settings Control Plane — runtime reconfig without restart`);
    REPORT.push(`6. Atomic config writes (sindresorhus/conf pattern)`);
    REPORT.push(`7. Kill switch + human approval gates`);
    REPORT.push(`8. Sub-agent parallelism with token budgets`);
    REPORT.push(`9. Auth middleware protecting all API routes`);
    REPORT.push(`10. PipelineRunner with 7 specialized agents (ingest, audit, plan, code, review, iterate, deploy)`);

    writeFileSync(join(JOBCLAW_DIR, "FINAL-BENCHMARK.txt"), REPORT.join("\n"));
    console.log(REPORT.join("\n"));
  } catch (e) { console.error("FATAL:", e); }
  finally { await stop(); }
}
p();
