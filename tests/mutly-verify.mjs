/**
 * Verify Mutly pipeline ran correctly by reading current state.
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const JOBCLAW_DIR = resolve(__dirname, "..");
const BASE = "http://localhost:3000";
const REPORT = [];

async function checkPage(description, fn) {
  try {
    REPORT.push(`\n## ${description}`);
    const result = await fn();
    REPORT.push(result || "  OK");
  } catch (e) {
    REPORT.push(`  ERROR: ${e.message}`);
  }
}

try {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("response", resp => {
    if (resp.url().includes("/api/")) {
      REPORT.push(`  API: ${resp.status()} ${resp.url().replace(BASE, "")}`);
    }
  });

  // Go to dashboard
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 20000 });
  // If landing page, try to enter
  const enterBtn = page.locator("button, a").filter({ hasText: /Enter|Get Started|Dashboard|enter/i }).first();
  if ((await enterBtn.count()) > 0) await enterBtn.click();
  await page.waitForTimeout(2000);

  // Check API health
  await checkPage("Health check", async () => {
    const res = await fetch(`${BASE}/health`);
    const body = await res.json();
    return `  Status: ${res.status}\n  Body: ${JSON.stringify(body, null, 2)}`;
  });

  // Check agent status
  await checkPage("Agent status", async () => {
    const res = await fetch(`${BASE}/api/agent/status`);
    if (res.ok) {
      const body = await res.json();
      const { status, pipeline, workflow } = body;
      return `  Daemon: ${status?.daemon}\n  Phase: ${status?.currentPhase}\n  Uptime: ${status?.uptime}s\n  Pipeline runs: ${pipeline?.totalRuns}\n  Steps: ${pipeline?.totalSteps}`;
    }
    return `  Status: ${res.status} ${res.statusText}`;
  });

  // Check settings
  await checkPage("Settings API (merged config)", async () => {
    const res = await fetch(`${BASE}/api/settings`);
    if (res.ok) {
      const body = await res.json();
      return `  Main agent: ${body.config?.features?.main_agent_enabled}\n  Agent mode: ${body.config?.agent?.mode}\n  Soul: ${body.soul?.name || "not loaded"}\n  Errors: ${body.errors?.length || 0}`;
    }
    return `  Status: ${res.status}`;
  });

  // Check spec/SPEC.md
  await checkPage("SPEC.md (pipeline plan)", async () => {
    const specTab = page.locator("nav, aside").locator("text=SPEC.md, text=SPEC");
    if ((await specTab.count()) > 0) await specTab.first().click();
    await page.waitForTimeout(1500);
    const text = await page.locator("body").innerText();
    const specSection = text.includes("SPEC") || text.includes("spec") || text.includes("Plan") || text.includes("plan");
    return `  SPEC.md visible: ${specSection}\n  Body length: ${text.length} chars`;
  });

  // Pipeline view
  await checkPage("Build Pipeline view", async () => {
    const buildTab = page.locator("nav, aside").locator("text='Build Pipeline', text=Pipeline");
    if ((await buildTab.count()) > 0) await buildTab.first().click();
    await page.waitForTimeout(1500);
    // Look for pipeline steps or results
    const text = await page.locator("body").innerText();
    const hasSteps = text.includes("Step") || text.includes("step");
    const hasBuild = text.includes("Build") || text.includes("build");
    return `  Pipeline visible: ${hasBuild}\n  Steps found: ${hasSteps}`;
  });

  // Settings page
  await checkPage("Settings pane", async () => {
    const settingsTab = page.locator("nav, aside").locator("text=Settings");
    if ((await settingsTab.count()) > 0) await settingsTab.first().click();
    await page.waitForTimeout(1500);
    const text = await page.locator("body").innerText();
    const hasConfig = text.includes("Agents") || text.includes("Runtime") || text.includes("Environment");
    return `  Settings tabs visible: ${hasConfig}\n  Shows: ${text.slice(0, 200).replace(/\n/g, " | ")}`;
  });

  await page.screenshot({ path: join(JOBCLAW_DIR, "mutly-verify.png"), fullPage: true });
  writeFileSync(join(JOBCLAW_DIR, "mutly-verify-report.txt"), REPORT.join("\n"));
  console.log(REPORT.join("\n"));
  await browser.close();
} catch (e) {
  console.error("FATAL:", e);
  REPORT.push(`\nFATAL: ${e.message}`);
  writeFileSync(join(JOBCLAW_DIR, "mutly-verify-report.txt"), REPORT.join("\n"));
}
