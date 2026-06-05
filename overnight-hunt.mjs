// Overnight Autopilot Job Hunting Script
// Runs the full autopilot pipeline in a continuous loop
import { writeFileSync, appendFileSync } from "fs";

const BASE = "http://localhost:3000";
const LOG_FILE = "overnight-hunt.log";
const CYCLE_DELAY_MS = 30000; // 30 seconds between full cycles
const CRONS = ["job_ingest_cron", "job_rank_cron", "application_prepare_cron", "submission_cron", "gmail_sync_cron", "followup_cron"];

const api = async (method, path, body) => {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    return await res.json();
  } catch (e) { return { error: e.message }; }
};

const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(LOG_FILE, line + "\n");
};

const getCounts = (queue) => {
  const counts = {};
  queue?.forEach(q => { counts[q.state] = (counts[q.state] || 0) + 1; });
  return counts;
};

console.log("=== JobClaw Overnight Autopilot Hunt ===");
console.log(`Starting at ${new Date().toISOString()}`);
console.log(`Cycle interval: ${CYCLE_DELAY_MS/1000}s`);
console.log(`Crons: ${CRONS.join(", ")}`);
console.log("---");

// First, ensure autopilot is ON
let state = await api("GET", "/api/autopilot/state");
if (!state.isRunning) {
  await api("POST", "/api/autopilot/toggle");
  log("Autopilot toggled ON");
}

let cycleCount = 0;

while (true) {
  cycleCount++;
  const cycleStart = Date.now();
  log(`=== Cycle ${cycleCount} ===`);

  // Run each cron in sequence
  for (const cron of CRONS) {
    const r = await api("POST", "/api/autopilot/trigger-cron", { cronName: cron });
    if (r.error) {
      log(`  ${cron}: ERROR ${r.error}`);
    } else {
      const counts = getCounts(r.queue);
      log(`  ${cron}: queue=${r.queue?.length || 0} ${JSON.stringify(counts)}`);
    }
    // Small delay between crons to avoid flooding
    await new Promise(r => setTimeout(r, 500));
  }

  // Re-trigger job ingest for a deeper crawl every 5 cycles
  if (cycleCount % 5 === 0) {
    const r = await api("POST", "/api/autopilot/trigger-cron", { cronName: "job_ingest_cron" });
    const discovered = r?.queue?.filter(q => q.state === "discovered").length || 0;
    log(`  Re-ingested cycle ${cycleCount}: ${discovered} new discoveries`);
  }

  // Log state summary
  state = await api("GET", "/api/autopilot/state");
  const totalApps = state?.queue?.filter(q => q.state === "tracked").length || 0;
  log(`  Summary: ${state?.queue?.length || 0} queue items, ${totalApps} submitted`);

  // Calculate remaining wait time
  const elapsed = Date.now() - cycleStart;
  const waitMs = Math.max(1000, CYCLE_DELAY_MS - elapsed);
  log(`  Waiting ${Math.round(waitMs / 1000)}s until next cycle...\n`);
  await new Promise(r => setTimeout(r, waitMs));
}
