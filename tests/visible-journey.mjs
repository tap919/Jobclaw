/**
 * Visible Playwright user journey test for Jobclaw.
 *
 * Starts the dev server, runs the user journey through Playwright
 * with visible screenshots, and reports findings.
 */
import { chromium } from "playwright";
import { spawn } from "child_process";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const RESUME_PATH = join(__dirname, "fixtures", "test-resume.txt");
const PROJECT_DIR = join(__dirname, "..");
const RESULTS = [];
let errors = [];
let serverProcess;

async function startServer() {
  console.log(`Starting Jobclaw dev server on port ${PORT}...`);
  serverProcess = spawn("node", ["--import", "tsx", "server.ts"], {
    cwd: PROJECT_DIR,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (d) => process.stdout.write(`[server] ${d}`));
  serverProcess.stderr.on("data", (d) => process.stderr.write(`[server-err] ${d}`));

  // Wait for server to be ready
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok || res.status === 200) {
        console.log(`Server ready on ${BASE}`);
        return;
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Server failed to start within 30s");
}

async function stopServer() {
  if (serverProcess) {
    console.log("Stopping server...");
    serverProcess.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 1000));
    if (!serverProcess.killed) {
      serverProcess.kill("SIGKILL");
    }
  }
}

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(err.message));

const snap = (name) => page.screenshot({ path: join(PROJECT_DIR, `journey-${name}.png`), fullPage: false });
const fullSnap = (name) => page.screenshot({ path: join(PROJECT_DIR, `journey-${name}.png`), fullPage: true });
const step = async (num, label, fn) => {
  try {
    RESULTS.push(`\n[${num}] ${label}`);
    console.log(`\n[${num}] ${label}`);
    await fn();
    RESULTS.push(`  ✓ ${label}`);
    console.log(`  ✓`);
  } catch (e) {
    RESULTS.push(`  ✗ ${label}: ${e.message}`);
    console.log(`  ✗ ${e.message}`);
  }
};

try {
  await startServer();

  RESULTS.push("=== JobClaw Full User Journey ===");
  RESULTS.push(`Started: ${new Date().toISOString()}\n`);

  // 1. Load the application
  await step(1, "Load application", async () => {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForSelector("#jobclaw-application", { timeout: 15000 });
    await page.waitForTimeout(1500);
    await fullSnap("01-loaded");
  });

  // 2. Dashboard View
  await step(2, "Dashboard view", async () => {
    const dashTab = page.locator("#nav-tab-dashboard");
    if ((await dashTab.count()) > 0) {
      await dashTab.first().click();
    }
    await page.waitForTimeout(1500);
    await fullSnap("02-dashboard");
    const text = await page.locator("body").innerText();
    RESULTS.push(`  Page mentions: "Dashboard" (${text.toLowerCase().includes("dashboard")})`);
  });

  // 3. Career Vault
  await step(3, "Career Vault view", async () => {
    const vaultTab = page.locator("#nav-tab-vault");
    if ((await vaultTab.count()) > 0) {
      await vaultTab.first().click();
    }
    await page.waitForTimeout(1500);
    await fullSnap("03-vault");
  });

  // 4. Jobs View
  await step(4, "Jobs view", async () => {
    const jobsTab = page.locator("#nav-tab-jobs");
    if ((await jobsTab.count()) > 0) {
      await jobsTab.first().click();
    }
    await page.waitForTimeout(1500);
    await fullSnap("04-jobs");
  });

  // 5. Applications View
  await step(5, "Applications view", async () => {
    const appsTab = page.locator("#nav-tab-applications");
    if ((await appsTab.count()) > 0) {
      await appsTab.first().click();
    }
    await page.waitForTimeout(1500);
    await fullSnap("05-applications");
  });

  // 6. Resume Studio (Upload)
  await step(6, "Resume Studio - upload", async () => {
    const studioTab = page.locator("#nav-tab-studio");
    if ((await studioTab.count()) > 0) {
      await studioTab.first().click();
    }
    await page.waitForTimeout(1500);
    await fullSnap("06a-resume-studio");
    // Try to upload resume if file input is present
    const fileInput = page.locator("input[type='file']");
    if ((await fileInput.count()) > 0) {
      await fileInput.first().setInputFiles(RESUME_PATH);
      await page.waitForTimeout(2000);
      await fullSnap("06b-uploading");
    }
  });

  // 7. ATS Scan
  await step(7, "ATS scan", async () => {
    const atsBtn = page.locator("button:has-text('ATS'), button:has-text('Scan')");
    if ((await atsBtn.count()) > 0) {
      await atsBtn.first().click();
      await page.waitForTimeout(2000);
    }
    await fullSnap("07-ats-scan");
  });

  // 8. Tailored resume
  await step(8, "Tailored resume", async () => {
    const tailorBtn = page.locator("button:has-text('Tailor'), button:has-text('Tailored')");
    if ((await tailorBtn.count()) > 0) {
      await tailorBtn.first().click();
      await page.waitForTimeout(2000);
    }
    await fullSnap("08-tailored");
  });

  // 9. Sectors
  await step(9, "Sector Packs", async () => {
    const sectorsTab = page.locator("#nav-tab-sectors");
    if ((await sectorsTab.count()) > 0) {
      await sectorsTab.first().click();
    }
    await page.waitForTimeout(1500);
    await fullSnap("09-sectors");
  });

  // 10. Autopilot
  await step(10, "Autopilot", async () => {
    const autoTab = page.locator("#nav-tab-autopilot");
    if ((await autoTab.count()) > 0) {
      await autoTab.first().click();
    }
    await page.waitForTimeout(1500);
    await fullSnap("10-autopilot");
  });

  // 11. Workspace
  await step(11, "Workspace", async () => {
    const wsTab = page.locator("#nav-tab-workspace");
    if ((await wsTab.count()) > 0) {
      await wsTab.first().click();
    }
    await page.waitForTimeout(1500);
    await fullSnap("11-workspace");
  });

  // 12. Analytics
  await step(12, "Analytics", async () => {
    const anaTab = page.locator("#nav-tab-analytics");
    if ((await anaTab.count()) > 0) {
      await anaTab.first().click();
    }
    await page.waitForTimeout(1500);
    await fullSnap("12-analytics");
  });

  // 13. Settings
  await step(13, "Settings", async () => {
    const settingsTab = page.locator("#nav-tab-settings");
    if ((await settingsTab.count()) > 0) {
      await settingsTab.first().click();
    }
    await page.waitForTimeout(1500);
    await fullSnap("13-settings");
  });

  RESULTS.push(`\n=== Errors collected: ${errors.length} ===`);
  if (errors.length > 0) {
    RESULTS.push("First 10 errors:");
    errors.slice(0, 10).forEach((e, i) => RESULTS.push(`  ${i + 1}. ${e}`));
  }

  writeFileSync(join(PROJECT_DIR, "journey-report.txt"), RESULTS.join("\n"));
  console.log("\nReport saved to journey-report.txt");
  console.log(`\nTotal errors: ${errors.length}`);
} catch (e) {
  console.error("Fatal error:", e);
  RESULTS.push(`\nFATAL: ${e.message}`);
  writeFileSync(join(PROJECT_DIR, "journey-report.txt"), RESULTS.join("\n"));
} finally {
  await stopServer();
  await browser.close();
}
