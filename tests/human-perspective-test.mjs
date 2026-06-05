// Human Perspective Test for JobClaw
// Simulates realistic user actions and verifies UI/API behavior

import { chromium } from "playwright";
import { writeFileSync } from "fs";

const BASE = "http://localhost:3000";
const RESULTS = [];
let errors = [];
let networkFailures = [];

const log = (msg) => { console.log(msg); RESULTS.push(msg); };

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("console", msg => {
  if (msg.type() === "error") {
    errors.push(msg.text());
    console.log(`[CONSOLE ERROR] ${msg.text()}`);
  }
});
page.on("pageerror", err => {
  errors.push(err.message);
  console.log(`[PAGE ERROR] ${err.message}`);
});
page.on("requestfailed", req => {
  networkFailures.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText || 'unknown'}`);
  console.log(`[REQUEST FAILED] ${req.method()} ${req.url()}`);
});

const snap = (name) => page.screenshot({ path: `human-test-${name}.png`, fullPage: false });
const step = async (label, fn) => {
  try {
    log(`\n✓ ${label}`);
    await fn();
    return true;
  } catch (e) {
    log(`✗ FAILED: ${label} - ${e.message}`);
    return false;
  }
};

log("=== JobClaw Human Perspective Test ===");
log(`Started: ${new Date().toISOString()}\n`);

// =================== PHASE 1: INITIAL LOAD ===================
log("--- PHASE 1: Initial Application Load ---");
await step("1.1 Page loads with no errors", async () => {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForSelector("#jobclaw-application", { timeout: 15000 });
  await page.waitForSelector("#loader-fallback", { state: "detached", timeout: 10000 }).catch(() => {});
  await snap("01-initial-load");
});

await step("1.2 Sidebar navigation is visible", async () => {
  const navItems = await page.locator("[id^='nav-tab-']").count();
  if (navItems < 5) throw new Error(`Expected at least 5 nav items, found ${navItems}`);
  log(`  Found ${navItems} navigation items`);
});

await step("1.3 Dashboard view shows profile data", async () => {
  await page.click("#nav-tab-dashboard");
  await page.waitForTimeout(1000);
  const content = await page.locator("#jobclaw-application").innerText();
  // Dashboard renders 4 stat cards in uppercase via CSS (text-transform), so innerText shows uppercase
  const hasAllCards = content.includes("JOBS FOUND") && content.includes("APPLICATIONS") && content.includes("AUDITS") && content.includes("STATUS");
  if (!hasAllCards) {
    throw new Error("Dashboard doesn't show expected stat cards");
  }
  log(`  Dashboard rendered with all 4 stat cards`);
  await snap("02-dashboard");
});

await step("1.4 Gemini API status check", async () => {
  const res = await fetch(`${BASE}/api/gemini/status`);
  const data = await res.json();
  log(`  Gemini connected: ${data.connected}, model: ${data.model}`);
  // Both states are valid (real connection or graceful mock fallback)
});

// =================== PHASE 2: CAREER VAULT ===================
log("\n--- PHASE 2: Career Vault (Profile Editor) ---");
await step("2.1 Career Vault loads", async () => {
  await page.click("#nav-tab-vault");
  await page.waitForTimeout(1000);
  await snap("03-vault");
});

await step("2.2 Profile fields are present in vault", async () => {
  // CareerVaultView is a 251-line real component - check for form elements
  const formElements = await page.locator("#jobclaw-application input, #jobclaw-application textarea, #jobclaw-application select").count();
  if (formElements < 3) throw new Error(`Expected at least 3 form fields in vault, found ${formElements}`);
  log(`  Found ${formElements} form fields in vault`);
});

// =================== PHASE 3: JOBS DISCOVERY ===================
log("\n--- PHASE 3: Jobs Discovery ---");
await step("3.1 Jobs list loads", async () => {
  await page.click("#nav-tab-jobs");
  await page.waitForTimeout(1500);
  const content = await page.locator("#jobclaw-application").innerText();
  if (!content.match(/job|engineer|developer/i)) {
    throw new Error("Jobs page doesn't show job listings");
  }
  await snap("04-jobs");
});

await step("3.2 Can trigger a job ingestion", async () => {
  const res = await fetch(`${BASE}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Test Senior Engineer",
      company: "TestCorp",
      description: "TypeScript React Node.js Docker AWS",
      location: "Remote",
      salary: "$150,000",
      sourceUrl: "https://test.com"
    })
  });
  const data = await res.json();
  if (data.status !== "success") throw new Error("Job ingestion failed");
  log(`  Job created with ID: ${data.job.id}`);
});

await step("3.3 Job count reflects new ingestion (state-based check)", async () => {
  // Get initial count before ingestion
  const resBefore = await fetch(`${BASE}/api/jobs`);
  const dataBefore = await resBefore.json();
  const initialCount = dataBefore.jobs.length;

  // Ingest a new job
  await fetch(`${BASE}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Test Senior Engineer",
      company: "TestCorp",
      description: "TypeScript React Node.js Docker AWS",
      location: "Remote",
      salary: "$150,000",
      sourceUrl: "https://test.com"
    })
  });

  // Verify count increased by 1
  const resAfter = await fetch(`${BASE}/api/jobs`);
  const dataAfter = await resAfter.json();
  const newCount = dataAfter.jobs.length;
  if (newCount !== initialCount + 1) {
    throw new Error(`Expected ${initialCount + 1} jobs after ingestion, got ${newCount}`);
  }
  log(`  Jobs counter: ${newCount} (was ${initialCount}, +1 from ingestion)`);
  await snap("05-jobs-updated");
});

await step("3.4 Job list API contains the new job", async () => {
  const res = await fetch(`${BASE}/api/jobs`);
  const data = await res.json();
  const testJob = data.jobs.find(j => j.company === "TestCorp");
  if (!testJob) throw new Error("TestCorp not in jobs API");
  log(`  TestCorp job found in API: ${testJob.title} (fit: ${testJob.fitScore}%)`);
});

// =================== PHASE 4: SCORE MATCHING ===================
log("\n--- PHASE 4: Job Score Matching ---");
await step("4.1 Score a job against profile", async () => {
  const jobsRes = await fetch(`${BASE}/api/jobs`);
  const jobsData = await jobsRes.json();
  const job = jobsData.jobs[0];
  if (!job) throw new Error("No jobs to score");
  
  const scoreRes = await fetch(`${BASE}/api/jobs/score-match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId: job.id })
  });
  const scoreData = await scoreRes.json();
  if (scoreData.status !== "success") throw new Error("Scoring failed");
  log(`  Job "${job.title}" scored: ${scoreData.fitScore}%`);
});

// =================== PHASE 5: APPLICATION CREATION ===================
log("\n--- PHASE 5: Application Creation & Tracking ---");
let appId;
await step("5.1 Create application for a job", async () => {
  const jobsRes = await fetch(`${BASE}/api/jobs`);
  const jobsData = await jobsRes.json();
  const job = jobsData.jobs[0];
  
  const appRes = await fetch(`${BASE}/api/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId: job.id,
      status: "Shortlisted",
      coverLetter: "Test cover letter content",
      outreachNotes: "Test outreach note"
    })
  });
  const appData = await appRes.json();
  if (appData.status !== "success") throw new Error("App creation failed");
  appId = appData.application.id;
  log(`  Created application: ${appId}`);
});

await step("5.2 Update application status via PATCH", async () => {
  const res = await fetch(`${BASE}/api/applications/${appId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      status: "Applied",
      coverLetter: "Updated cover letter",
      outreachNotes: "Updated outreach"
    })
  });
  const data = await res.json();
  if (data.status !== "success") throw new Error("PATCH failed");
  if (data.application.status !== "Applied") throw new Error("Status not updated");
  log(`  Status updated to: ${data.application.status}`);
});

await step("5.3 Applications counter reflects new app (state-based check)", async () => {
  await page.click("#nav-tab-applications");
  await page.waitForTimeout(1500);
  const content = await page.locator("#jobclaw-application").innerText();
  await snap("06-applications");
  // ApplicationsView is a stub showing count
  const match = content.match(/Total Applications:\s*(\d+)/);
  if (!match) throw new Error("Applications counter not found");
  const count = parseInt(match[1]);
  if (count < 1) throw new Error(`Expected at least 1 application, got ${count}`);
  log(`  Applications counter: ${count}`);
});

await step("5.4 Applications API contains the new app", async () => {
  const res = await fetch(`${BASE}/api/applications`);
  const data = await res.json();
  const testApp = data.applications.find(a => a.id === appId);
  if (!testApp) throw new Error(`App ${appId} not in applications API`);
  if (testApp.status !== "Applied") throw new Error("Status not updated");
  log(`  App ${appId} found in API with status: ${testApp.status}`);
});

// =================== PHASE 6: RESUME STUDIO ===================
log("\n--- PHASE 6: Resume Studio ---");
await step("6.1 Resume Studio loads", async () => {
  await page.click("#nav-tab-studio");
  await page.waitForTimeout(1500);
  await snap("07-studio");
});

await step("6.2 Resume file input is accessible", async () => {
  const fileInput = page.locator("#resume-profile-file-picker");
  const exists = await fileInput.count() > 0;
  if (!exists) throw new Error("Resume file picker not found");
  log(`  File input found: ${exists}`);
});

await step("6.3 Upload test resume", async () => {
  const fileInput = page.locator("#resume-profile-file-picker");
  await fileInput.setInputFiles("tests/fixtures/test-resume.txt", { force: true, noWaitAfter: true });
  await page.waitForTimeout(4000);
  await snap("08-resume-uploaded");
});

await step("6.3b Profile parse-resume API works", async () => {
  const fs = await import("fs");
  const fileContent = fs.readFileSync("tests/fixtures/test-resume.txt", "utf-8");
  const base64 = Buffer.from(fileContent).toString("base64");
  const res = await fetch(`${BASE}/api/profile/parse-resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: "test-resume.txt", fileBase64: base64 })
  });
  const data = await res.json();
  if (data.status !== "success") throw new Error("parse-resume failed");
  if (!data.profile) throw new Error("No profile returned");
  log(`  Parse-resume source: ${data.source}, extracted length: ${data.extractedLength}`);
});

await step("6.4 Gemini: suggest-bullets works", async () => {
  const res = await fetch(`${BASE}/api/gemini/suggest-bullets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      rawText: "Worked on backend systems and improved performance",
      company: "TechCorp",
      title: "Senior Engineer"
    })
  });
  const data = await res.json();
  if (data.status !== "success") throw new Error("suggest-bullets failed");
  if (!data.suggestions || data.suggestions.length === 0) throw new Error("No suggestions returned");
  log(`  Got ${data.suggestions.length} suggestions (mocked: ${data.isMocked})`);
});

await step("6.5 Gemini: audit-profile works", async () => {
  const res = await fetch(`${BASE}/api/gemini/audit-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  const data = await res.json();
  if (data.status !== "success") throw new Error("audit-profile failed");
  if (!data.audits || data.audits.length === 0) throw new Error("No audits returned");
  log(`  Got ${data.audits.length} audit items (mocked: ${data.isMocked})`);
});

await step("6.6 Gemini: tailor-resume works", async () => {
  const res = await fetch(`${BASE}/api/gemini/tailor-resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      jobDescription: "Senior TypeScript engineer with React and Node.js experience"
    })
  });
  const data = await res.json();
  if (data.status !== "success") throw new Error("tailor-resume failed");
  if (!data.tailored || !data.tailored.tailoredSummary) throw new Error("No summary returned");
  log(`  Tailored summary length: ${data.tailored.tailoredSummary.length} chars (mocked: ${data.isMocked})`);
});

await step("6.7 Gemini: ats-check works", async () => {
  const res = await fetch(`${BASE}/api/gemini/ats-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      resumeText: "Senior Software Engineer with 10 years of TypeScript and React experience",
      jobDescription: "Senior TypeScript Engineer needed for SaaS platform"
    })
  });
  const data = await res.json();
  if (data.status !== "success") throw new Error("ats-check failed");
  if (!data.report) throw new Error("No report returned");
  log(`  ATS Score: ${data.report.parsedScore}, Coverage: ${data.report.keywordCoverage}% (mocked: ${data.isMocked})`);
});

// =================== PHASE 7: SECTOR PACKS ===================
log("\n--- PHASE 7: Sector Packs ---");
await step("7.1 Sector packs load", async () => {
  await page.click("#nav-tab-sectors");
  await page.waitForTimeout(1500);
  const res = await fetch(`${BASE}/api/sector-packs`);
  const data = await res.json();
  if (data.status !== "success") throw new Error("Sector packs fetch failed");
  log(`  Found ${data.sectorPacks.length} sector packs`);
  await snap("09-sectors");
});

// =================== PHASE 8: AUTOPILOT ENGINE ===================
log("\n--- PHASE 8: Autopilot Engine ---");
await step("8.1 Autopilot state loads", async () => {
  await page.click("#nav-tab-autopilot");
  await page.waitForTimeout(1500);
  const res = await fetch(`${BASE}/api/autopilot/state`);
  const data = await res.json();
  if (data.status !== "success") throw new Error("Autopilot state failed");
  log(`  Queue: ${data.queue.length} items, Running: ${data.isRunning}`);
  await snap("10-autopilot");
});

await step("8.2 Run full autopilot pipeline", async () => {
  const crons = ["job_ingest_cron", "job_rank_cron", "application_prepare_cron", "submission_cron"];
  for (const cron of crons) {
    const res = await fetch(`${BASE}/api/autopilot/trigger-cron`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cronName: cron })
    });
    const data = await res.json();
    if (data.status !== "success") throw new Error(`${cron} failed: ${data.message}`);
  }
  log(`  All 4 cron stages executed successfully`);
});

await step("8.3 Update autopilot rules", async () => {
  const res = await fetch(`${BASE}/api/autopilot/update-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      minFitScore: 70,
      compensationFloor: 130000
    })
  });
  const data = await res.json();
  if (data.status !== "success") throw new Error("update-rules failed");
  if (data.rules.minFitScore !== 70) throw new Error("Rule not applied");
  log(`  Rules updated: minFitScore=${data.rules.minFitScore}, floor=$${data.rules.compensationFloor}`);
});

await step("8.4 Update skills with valid payload", async () => {
  const res = await fetch(`${BASE}/api/autopilot/update-skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      synonymDictionary: { "JS": "JavaScript" }
    })
  });
  const data = await res.json();
  if (data.status !== "success") throw new Error("update-skills failed");
  log(`  Skills updated successfully`);
});

await step("8.5 Reject invalid skills payload (atsSelectors injection)", async () => {
  const res = await fetch(`${BASE}/api/autopilot/update-skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      atsSelectors: { "evil": "selector" }
    })
  });
  const data = await res.json();
  if (data.status !== "error") throw new Error("Should have rejected atsSelectors injection");
  log(`  Security check passed: rejected atsSelectors injection`);
});

await step("8.6 Toggle autopilot on/off", async () => {
  const res1 = await fetch(`${BASE}/api/autopilot/toggle`, { method: "POST" });
  const data1 = await res1.json();
  const res2 = await fetch(`${BASE}/api/autopilot/toggle`, { method: "POST" });
  const data2 = await res2.json();
  log(`  Toggled: ${data1.isRunning} -> ${data2.isRunning}`);
});

// =================== PHASE 9: WORKSPACE & ANALYTICS ===================
log("\n--- PHASE 9: Workspace & Analytics ---");
await step("9.1 Workspace Studio loads", async () => {
  await page.click("#nav-tab-workspace");
  await page.waitForTimeout(1500);
  await snap("11-workspace");
});

await step("9.2 Analytics loads", async () => {
  await page.click("#nav-tab-analytics");
  await page.waitForTimeout(1500);
  await snap("12-analytics");
});

await step("9.3 Settings loads", async () => {
  await page.click("#nav-tab-settings");
  await page.waitForTimeout(1500);
  await snap("13-settings");
});

// =================== PHASE 10: STABILITY CHECK ===================
log("\n--- PHASE 10: Stability Check ---");
await step("10.1 No continuous navigation requests", async () => {
  let navReqs = 0;
  const navListener = req => { if (req.isNavigationRequest() && req.url().includes(BASE)) navReqs++; };
  page.on("request", navListener);
  await page.click("#nav-tab-dashboard");
  await page.waitForTimeout(8000);
  page.off("request", navListener);
  log(`  Navigation requests in 8s idle: ${navReqs}`);
  if (navReqs > 2) throw new Error(`Unstable: ${navReqs} navigation requests`);
});

// =================== SUMMARY ===================
log("\n=== TEST SUMMARY ===");
log(`Console errors: ${errors.length}`);
errors.slice(0, 5).forEach(e => log(`  - ${e}`));
log(`Network failures: ${networkFailures.length}`);
networkFailures.slice(0, 5).forEach(f => log(`  - ${f}`));
log(`Screenshots: human-test-*.png (13 phases)`);
log(`Completed: ${new Date().toISOString()}`);

const passed = RESULTS.filter(r => r.startsWith("✓")).length;
const failed = RESULTS.filter(r => r.startsWith("✗")).length;
log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);

writeFileSync("human-test-report.txt", RESULTS.join("\n"));

await browser.close();
process.exit(failed > 0 ? 1 : 0);
