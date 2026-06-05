import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";

const BASE = "http://localhost:3000";
const RESUME_PATH = "test-resume.txt";
const RESULTS = [];
let errors = [];

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", err => errors.push(err.message));

const snap = (name) => page.screenshot({ path: `journey-${name}.png` });
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

RESULTS.push("=== JobClaw Full User Journey ===");
RESULTS.push(`Started: ${new Date().toISOString()}\n`);

// 1. Load the application
await step(1, "Load application", async () => {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForSelector("#jobclaw-application", { timeout: 15000 });
  await page.waitForSelector("#loader-fallback", { state: "detached", timeout: 10000 }).catch(() => {});
  await snap("01-loaded");
  await page.waitForTimeout(500);
});

// 2. Dashboard View
await step(2, "Dashboard view", async () => {
  await page.click("#nav-tab-dashboard");
  await page.waitForTimeout(1000);
  await snap("02-dashboard");
  const text = await page.locator("#jobclaw-application").innerText();
  RESULTS.push(`  Page contains: "Dashboard" (${text.includes("Dashboard")}), "Profile" (${text.includes("Profile")})`);
});

// 3. Career Vault
await step(3, "Career Vault", async () => {
  await page.click("#nav-tab-vault");
  await page.waitForTimeout(1000);
  await snap("03-vault");
});

// 4. Jobs
await step(4, "Jobs list", async () => {
  await page.click("#nav-tab-jobs");
  await page.waitForTimeout(1000);
  await snap("04-jobs");
});

// 5. Applications
await step(5, "Applications", async () => {
  await page.click("#nav-tab-applications");
  await page.waitForTimeout(1000);
  await snap("05-applications");
});

// 6. Resume Studio - Upload Resume & Run Improvements
await step(6, "Resume Studio - Upload & Improve", async () => {
  await page.click("#nav-tab-studio");
  await page.waitForTimeout(1500);
  await snap("06a-resume-studio");

  // Upload resume file - input is hidden, use force: true
  const fileInput = page.locator('#resume-profile-file-picker');
  const exists = await fileInput.count().then(c => c > 0).catch(() => false);
  RESULTS.push(`  File input exists in DOM: ${exists}`);

  if (exists) {
    await fileInput.setInputFiles(RESUME_PATH, { force: true, noWaitAfter: true });
    RESULTS.push(`  File "${RESUME_PATH}" selected`);
    await page.waitForTimeout(4000);
    await snap("06b-uploading");

    // Scroll into view the recommendations area
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Check for adopt button
    const adoptBtn = page.locator("button", { hasText: /Adopt Improved/ });
    const adoptVisible = await adoptBtn.isVisible().catch(() => false);
    RESULTS.push(`  Improvement suggestions appeared: ${adoptVisible}`);
    if (adoptVisible) {
      await adoptBtn.scrollIntoViewIfNeeded();
      await adoptBtn.click();
      await page.waitForTimeout(800);
      await snap("06c-improvements-adopted");
      RESULTS.push(`  Improvements adopted, ATS score should show 98/100`);
    }
  }
});

// 7. ATS Scan
await step(7, "ATS Scan", async () => {
  const scanBtn = page.locator("button", { hasText: /Scan Integrity/ });
  if (await scanBtn.count().then(c => c > 0).catch(() => false)) {
    await scanBtn.scrollIntoViewIfNeeded();
    await scanBtn.click({ force: true });
    await page.waitForTimeout(4000);
    await snap("07-ats-scan");
  } else {
    RESULTS.push(`  Scan Integrity button not found in DOM`);
  }
});

// 8. Auto-Tailor Resume
await step(8, "Auto-Tailor Resume", async () => {
  const tailorBtn = page.locator("button", { hasText: /Auto-Tailor/ });
  if (await tailorBtn.count().then(c => c > 0).catch(() => false)) {
    await tailorBtn.scrollIntoViewIfNeeded();
    await tailorBtn.click({ force: true });
    await page.waitForTimeout(3000);
    await snap("08-tailored");
  } else {
    RESULTS.push(`  Auto-Tailor button not found in DOM`);
  }
});

// 9. Sector Packs
await step(9, "Sector Packs", async () => {
  await page.click("#nav-tab-sectors");
  await page.waitForTimeout(1000);
  await snap("09-sectors");
});

// 10. Autopilot Console
await step(10, "Autopilot Console", async () => {
  await page.click("#nav-tab-autopilot");
  await page.waitForTimeout(1500);
  await snap("10-autopilot");
});

// 11. Workspace Studio (Admin)
await step(11, "Workspace Studio", async () => {
  await page.click("#nav-tab-workspace");
  await page.waitForTimeout(1000);
  await snap("11-workspace");
});

// 12. Analytics
await step(12, "Analytics", async () => {
  await page.click("#nav-tab-analytics");
  await page.waitForTimeout(1000);
  await snap("12-analytics");
});

// 13. Settings
await step(13, "Settings", async () => {
  await page.click("#nav-tab-settings");
  await page.waitForTimeout(1000);
  await snap("13-settings");
});

// Summary
RESULTS.push("\n=== Journey Summary ===");
RESULTS.push(`Total console errors: ${errors.length}`);
if (errors.length > 0) {
  errors.slice(0, 5).forEach(e => RESULTS.push(`  Error: ${e}`));
}
RESULTS.push(`Screenshots: journey-*.png (13 steps)`);
RESULTS.push(`Completed: ${new Date().toISOString()}`);

writeFileSync("journey-report.txt", RESULTS.join("\n"));
console.log("\n=== Journey Complete ===");
console.log(`Console errors: ${errors.length}`);
console.log("Report: journey-report.txt");
console.log("Screenshots: journey-*.png");

await browser.close();
process.exit(errors.length > 0 ? 1 : 0);
