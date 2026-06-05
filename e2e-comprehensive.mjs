// Comprehensive E2E test: UI journey + autopilot pipeline + stability check
import { chromium } from "playwright";
import { writeFileSync } from "fs";

const BASE = "http://localhost:3000";
const REPORT = [];
let consoleErrors = [];
let apiFailures = [];

const log = (msg) => { console.log(msg); REPORT.push(msg); };
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
page.on("pageerror", err => consoleErrors.push(err.message));
const snap = (name) => page.screenshot({ path: `e2e-${name}.png` });

const api = async (method, path, body) => {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined
    });
    return await res.json();
  } catch (e) { apiFailures.push(`${method} ${path}: ${e.message}`); return null; }
};

const step = async (num, label, fn) => {
  try {
    log(`\n[${num}] ${label}`);
    await fn();
    log(`  ✓`);
  } catch (e) { log(`  ✗ ${e.message}`); }
};

log("=== JobClaw Comprehensive E2E Test ===");
log(`Started: ${new Date().toISOString()}\n`);

// ===== PART 1: UI NAVIGATION =====
log("=== PART 1: UI NAVIGATION ===");
await step("1.1", "Load app", async () => {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForSelector("#jobclaw-application", { timeout: 15000 });
  await page.waitForSelector("#loader-fallback", { state: "detached", timeout: 10000 }).catch(() => {});
  await snap("01-loaded");
});

// Navigate all sidebar views
const views = [
  { id: "dashboard", name: "Dashboard" },
  { id: "vault", name: "Career Vault" },
  { id: "jobs", name: "Jobs" },
  { id: "applications", name: "Applications" },
  { id: "studio", name: "Resume Studio" },
  { id: "sectors", name: "Sector Packs" },
  { id: "autopilot", name: "Autopilot Console" },
  { id: "workspace", name: "Workspace Studio" },
  { id: "analytics", name: "Analytics" },
  { id: "settings", name: "Settings" },
];
for (const v of views) {
  await step(`1.${views.indexOf(v)+2}`, `Navigate to ${v.name}`, async () => {
    await page.click(`#nav-tab-${v.id}`);
    await page.waitForTimeout(800);
    await snap(`nav-${v.id}`);
  });
}

// ===== PART 2: RESUME UPLOAD & IMPROVEMENT =====
log("\n=== PART 2: RESUME OPERATIONS ===");
await step("2.1", "Go to Resume Studio", async () => {
  await page.click("#nav-tab-studio");
  await page.waitForTimeout(1000);
});
await step("2.2", "Upload resume", async () => {
  const input = page.locator("#resume-profile-file-picker");
  await input.setInputFiles("test-resume.txt", { force: true, noWaitAfter: true });
  await page.waitForTimeout(4000);
  await snap("resume-uploaded");
});
await step("2.3", "Adopt improvements", async () => {
  const btn = page.locator("button", { hasText: /Adopt Improved/ });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(800);
    await snap("resume-adopted");
  }
});
await step("2.4", "Run ATS scan", async () => {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);
  const btn = page.locator("button", { hasText: /Scan Integrity/ });
  if (await btn.count().then(c => c > 0)) {
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ force: true });
    await page.waitForTimeout(4000);
    await snap("ats-scan");
  }
});
await step("2.5", "Auto-tailor resume", async () => {
  const btn = page.locator("button", { hasText: /Auto-Tailor/ });
  if (await btn.count().then(c => c > 0)) {
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ force: true });
    await page.waitForTimeout(3000);
    await snap("tailored");
  }
});

// ===== PART 3: APPLICATION MANAGEMENT =====
log("\n=== PART 3: APPLICATION MANAGEMENT ===");
let appId;
await step("3.1", "Trigger application from jobs", async () => {
  await page.click("#nav-tab-jobs");
  await page.waitForTimeout(1000);
  const applyBtn = page.locator("button", { hasText: /Apply|Track|Shortlist/i }).first();
  if (await applyBtn.isVisible().catch(() => false)) {
    await applyBtn.click();
    await page.waitForTimeout(1500);
    await snap("app-triggered");
  }
});
await step("3.2", "Check applications list", async () => {
  await page.click("#nav-tab-applications");
  await page.waitForTimeout(1000);
  await snap("apps-list");
});

// ===== PART 4: AUTOPILOT PIPELINE =====
log("\n=== PART 4: AUTOPILOT ENGINE ===");
await step("4.1", "Get pre-flight state", async () => {
  const state = await api("GET", "/api/autopilot/state");
  log(`  Queue: ${state?.queue?.length || 0} items, Running: ${state?.isRunning}`);
});

await step("4.2", "Toggle autopilot ON", async () => {
  const r = await api("POST", "/api/autopilot/toggle");
  log(`  Running: ${r.isRunning}`);
});

await step("4.3", "Trigger job_ingest_cron", async () => {
  const r = await api("POST", "/api/autopilot/trigger-cron", { cronName: "job_ingest_cron" });
  const discovered = r?.queue?.filter(q => q.state === "discovered").length || 0;
  log(`  Discovered new: ${discovered}`);
});

await step("4.4", "Trigger job_rank_cron", async () => {
  const r = await api("POST", "/api/autopilot/trigger-cron", { cronName: "job_rank_cron" });
  const scored = r?.queue?.filter(q => q.state === "scored").length || 0;
  const errors = r?.queue?.filter(q => q.state === "error").length || 0;
  log(`  Scored: ${scored}, Errors: ${errors}`);
});

await step("4.5", "Trigger application_prepare_cron", async () => {
  const r = await api("POST", "/api/autopilot/trigger-cron", { cronName: "application_prepare_cron" });
  const prepped = r?.queue?.filter(q => q.state === "validation_passed").length || 0;
  log(`  Validated: ${prepped}`);
});

await step("4.6", "Trigger submission_cron", async () => {
  const r = await api("POST", "/api/autopilot/trigger-cron", { cronName: "submission_cron" });
  const tracked = r?.queue?.filter(q => q.state === "tracked").length || 0;
  log(`  Submitted (tracked): ${tracked}`);
});

await step("4.7", "Trigger gmail_sync_cron", async () => {
  await api("POST", "/api/autopilot/trigger-cron", { cronName: "gmail_sync_cron" });
  log(`  Gmail sync triggered`);
});

await step("4.8", "Trigger followup_cron", async () => {
  await api("POST", "/api/autopilot/trigger-cron", { cronName: "followup_cron" });
  log(`  Follow-up cron triggered`);
});

await step("4.9", "Verify final autopilot state", async () => {
  const state = await api("GET", "/api/autopilot/state");
  const states = {};
  state?.queue?.forEach(q => { states[q.state] = (states[q.state] || 0) + 1; });
  log(`  Queue breakdown: ${JSON.stringify(states)}`);
  await snap("autopilot-final");
});

await step("4.10", "Toggle autopilot OFF", async () => {
  await api("POST", "/api/autopilot/toggle");
  log(`  Autopilot stopped`);
});

await step("4.11", "Toggle autopilot OFF", async () => {
  await api("POST", "/api/autopilot/toggle");
  log(`  Autopilot stopped`);
});

// ===== PART 5: STABILITY CHECK =====
log("\n=== PART 5: STABILITY CHECK ===");
let navRequests = 0;
page.on("request", req => { if (req.isNavigationRequest() && req.url().includes(BASE)) navRequests++; });

await step("5.1", "Monitor for 10s idle", async () => {
  navRequests = 0;
  await page.waitForTimeout(10000);
  log(`  Navigation requests in 10s idle: ${navRequests}`);
});

await step("5.2", "Verify 0 content changes", async () => {
  let changes = 0;
  let prev = await page.locator("#jobclaw-application").innerText().catch(() => "");
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1000);
    const cur = await page.locator("#jobclaw-application").innerText().catch(() => "");
    if (prev && cur !== prev) changes++;
    prev = cur;
  }
  log(`  Content changes in 5s: ${changes}`);
});

// ===== SUMMARY =====
log("\n=== E2E TEST SUMMARY ===");
log(`Console errors: ${consoleErrors.length}`);
consoleErrors.slice(0, 5).forEach(e => log(`  ${e}`));
log(`API failures: ${apiFailures.length}`);
apiFailures.slice(0, 5).forEach(f => log(`  ${f}`));
log(`Stability: ${navRequests === 0 ? "STABLE ✓" : "UNSTABLE - navigation requests detected"}`);
log(`Completed: ${new Date().toISOString()}`);

writeFileSync("e2e-report.txt", REPORT.join("\n"));
log("\nReport: e2e-report.txt, Screenshots: e2e-*.png");

await browser.close();
process.exit(consoleErrors.length > 0 && apiFailures.length > 0 ? 1 : 0);
