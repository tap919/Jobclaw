/**
 * Mutly daemon smoke test — runs the full pipeline on Jobclaw repo.
 * 
 * Starts Mutly, opens UI in Playwright, navigates through the
 * pipeline (Import → Audit → Plan → Build), takes screenshots.
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
const RESULTS = [];

let serverProcess;
let errors = [];

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
    if (s.includes("ready") || s.includes("active") || s.includes("listening")) {
      console.log("  [mutly]", s.trim());
    }
  });
  serverProcess.stderr.on("data", d => {
    const s = d.toString().trim();
    if (s && !s.includes("ExperimentalWarning") && !s.includes("Warning")) {
      console.log("  [mutly:err]", s);
    }
  });
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) { console.log("Mutly ready on", BASE); return; }
    } catch { /* wait */ }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("Mutly failed to start within 60s");
}

async function stopMutly() {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    await new Promise(r => setTimeout(r, 2000));
    if (!serverProcess.killed) serverProcess.kill("SIGKILL");
  }
}

const step = async (num, label, fn) => {
  try {
    RESULTS.push(`\n[${num}] ${label}`);
    console.log(`\n[${num}] ${label}`);
    await fn();
    RESULTS.push(`  ✓`);
    console.log(`  ✓`);
  } catch (e) {
    RESULTS.push(`  ✗ ${e.message}`);
    console.log(`  ✗ ${e.message}`);
  }
};

try {
  await startMutly();
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", err => errors.push(err.message));
  const snap = name => page.screenshot({ path: join(JOBCLAW_DIR, `mutly-${name}.png`), fullPage: true });

  RESULTS.push("=== Mutly Pipeline on Jobclaw ===");
  RESULTS.push(`Started: ${new Date().toISOString()}`);

  // 1. Load Mutly app
  await step(1, "Load Mutly landing", async () => {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await snap("01-landing");
  });

  // 2. Enter dashboard (click landing page enter)
  await step(2, "Enter dashboard", async () => {
    const enterBtn = page.locator("button:has-text('Enter'), a:has-text('Dashboard'), button:has-text('Get Started')");
    if ((await enterBtn.count()) > 0) {
      await enterBtn.first().click();
      await page.waitForTimeout(2000);
    }
    await snap("02-dashboard");
  });

  // 3. Import Jobclaw as source
  await step(3, "Source Import — select Jobclaw repo", async () => {
    const importTab = page.locator("button:has-text('Source Import'), nav >> text=Source Import");
    if ((await importTab.count()) > 0) await importTab.first().click();
    await page.waitForTimeout(1500);
    // Look for file input or path import
    const pathInput = page.locator("input[type='text'], input[placeholder*='path'], input[placeholder*='Path']").first();
    if ((await pathInput.count()) > 0) {
      await pathInput.fill(JOBCLAW_DIR);
      await page.waitForTimeout(500);
      const importBtn = page.locator("button:has-text('Import'), button:has-text('Load')").first();
      if ((await importBtn.count()) > 0) await importBtn.click();
      await page.waitForTimeout(2000);
    }
    await snap("03-source-import");
  });

  // 4. Navigate to Build Pipeline
  await step(4, "Open Build Pipeline", async () => {
    const buildTab = page.locator("button:has-text('Build Pipeline'), nav >> text=Built Pipeline");
    if ((await buildTab.count()) > 0) await buildTab.first().click();
    await page.waitForTimeout(2000);
    await snap("04-build-pipeline");
  });

  // 5. Run pipeline
  await step(5, "Run pipeline on Jobclaw", async () => {
    const runBtn = page.locator("button:has-text('Run'), button:has-text('Execute'), button:has-text('Start')").first();
    if ((await runBtn.count()) > 0) await runBtn.click();
    await page.waitForTimeout(5000);
    await snap("05-pipeline-running");
    // Wait more for pipeline progress
    await page.waitForTimeout(5000);
    await snap("06-pipeline-result");
  });

  // 6. Check SPEC.md
  await step(6, "Check SPEC.md tab", async () => {
    const specTab = page.locator("button:has-text('SPEC.md'), nav >> text=SPEC");
    if ((await specTab.count()) > 0) await specTab.first().click();
    await page.waitForTimeout(2000);
    await snap("07-spec-md");
  });

  // 7. Check Daemon status
  await step(7, "Mutly Daemon status", async () => {
    const deamonTab = page.locator("button:has-text('Mutly Daemon'), nav >> text=Daemon");
    if ((await deamonTab.count()) > 0) await deamonTab.first().click();
    await page.waitForTimeout(2000);
    await snap("08-daemon");
  });

  // 8. Settings
  await step(8, "Settings panel", async () => {
    const settingsTab = page.locator("button:has-text('Settings'), nav >> text=Settings");
    if ((await settingsTab.count()) > 0) await settingsTab.first().click();
    await page.waitForTimeout(2000);
    await snap("09-settings");
  });

  RESULTS.push(`\nErrors: ${errors.length}`);
  if (errors.length > 0) RESULTS.push(errors.slice(0, 5).join("\n"));
  
  writeFileSync(join(JOBCLAW_DIR, "mutly-report.txt"), RESULTS.join("\n"));
  console.log("\n=== Done. Report at mutly-report.txt ===");

  await browser.close();
} catch (e) {
  console.error("FATAL:", e);
  writeFileSync(join(JOBCLAW_DIR, "mutly-report.txt"), RESULTS.concat([`\nFATAL: ${e.message}`]).join("\n"));
} finally {
  await stopMutly();
}
