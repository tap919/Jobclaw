import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", err => console.log(`  [PAGE_ERR] ${err.message}`));
page.on("console", msg => { if (msg.type() === "error") console.log(`  [CONSOLE_ERR] ${msg.text()}`); });

const result = { pass: 0, fail: 0 };

async function assert(label, condition, detail = "") {
  if (condition) { result.pass++; console.log(`  ✓ ${label}`); }
  else { result.fail++; console.log(`  ✗ ${label} ${detail}`); }
}

await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 15000 });
await page.waitForTimeout(2000);

// 1. Initial state: Dashboard should be visible
const initialContent = await page.locator("#jobclaw-application").innerText();
assert("App renders without errors", initialContent.length > 200);
assert("Initial workspace is Dashboard", initialContent.includes("JOBS FOUND"));

// 2. Click sidebar items by index - test tab navigation
const sidebar = page.locator("#jobclaw-sidebar");
const sidebarBtns = sidebar.locator("button");

// 2a. Click Jobs (index 2) - should show jobs content
await sidebarBtns.nth(2).click();
await page.waitForTimeout(500);
const jobsContent = await page.locator("main").innerText();
assert("Clicking 'Jobs' shows jobs content", jobsContent.includes("Total Jobs"));

// 2b. Click Applications (index 3) - should show applications content
await sidebarBtns.nth(3).click();
await page.waitForTimeout(500);
const appContent = await page.locator("main").innerText();
assert("Clicking 'Applications' shows applications content", appContent.includes("Total Applications"));

// 2c. Click Career Vault (index 1) - should show vault content
await sidebarBtns.nth(1).click();
await page.waitForTimeout(500);
const vaultContent = await page.locator("main").innerText();
assert("Clicking 'Career Vault' shows vault content", vaultContent.includes("Vault Content"));

// 2d. Click back to Dashboard (index 0)
await sidebarBtns.nth(0).click();
await page.waitForTimeout(500);
const dashContent = await page.locator("main").innerText();
assert("Clicking 'Dashboard' shows dashboard content", dashContent.includes("JOBS FOUND"));

// 3. Test workspace switching
// 3a. Autopilot Console (index 6) → resolve workspace
await sidebarBtns.nth(6).click();
await page.waitForTimeout(800);
const resolveContent = await page.locator("main").innerText();
assert("Clicking 'Autopilot Console' shows resolve workspace", resolveContent.includes("RESOLVE WORKSPACE") || resolveContent.includes("Exception Inbox"));

// Navigate back to review for next test
await sidebarBtns.nth(0).click();
await page.waitForTimeout(500);

// 3b. Workspace Studio (index 7) → admin workspace
await sidebarBtns.nth(7).click();
await page.waitForTimeout(800);
const adminContent = await page.locator("main").innerText();
assert("Clicking 'Workspace Studio' shows admin workspace", adminContent.includes("Admin Workspace") || adminContent.includes("Connector Studio"));

// 4. Stability test: monitor for content flicker while clicking rapidly
await sidebarBtns.nth(0).click();
await page.waitForTimeout(500);

let flickers = 0;
for (const idx of [0, 2, 3, 1, 0, 2, 3, 1, 0]) {
  const prev = await page.locator("#jobclaw-application").innerText();
  await sidebarBtns.nth(idx).click();
  await page.waitForTimeout(200);
  const cur = await page.locator("#jobclaw-application").innerText();
  // Only count as flicker if content CHANGED and then CHANGED BACK quickly
  if (cur !== prev) {
    // Wait a bit and check if it changed again
    await page.waitForTimeout(300);
    const cur2 = await page.locator("#jobclaw-application").innerText();
    if (cur2 === prev) flickers++;
  }
}
assert("No rapid content flicker during navigation", flickers === 0, `(flickers: ${flickers})`);

// 5. Error check
const mainText = await page.locator("#jobclaw-application").innerText();
assert("No error boundary shown", !mainText.includes("Application Error Detected"));

console.log(`\nResults: ${result.pass} passed, ${result.fail} failed`);
await page.screenshot({ path: "navtest-final-verdict.png" });
await browser.close();
process.exit(result.fail > 0 ? 1 : 0);
