import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", msg => {
  if (msg.type() === "error" || msg.text().includes("[NAV]")) console.log(`  ${msg.type()}: ${msg.text()}`);
});

await page.addInitScript(() => {
  window.__events = [];
  const origPushState = history.pushState.bind(history);
  history.pushState = (...args) => {
    window.__events.push(`pushState(${args[2]})`);
    origPushState(...args);
  };
  const origReplaceState = history.replaceState.bind(history);
  history.replaceState = (...args) => {
    window.__events.push(`replaceState(${args[2]})`);
    origReplaceState(...args);
  };
});

await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector("#jobclaw-application", { timeout: 15000 });
await page.waitForTimeout(2000);

const sidebar = page.locator("#jobclaw-sidebar");
const sidebarBtns = sidebar.locator("button");

// Check initial history events
let events = await page.evaluate(() => window.__events);
console.log(`Initial history events: ${events.length}`);

// Click Workspace Studio directly (first click after fresh load)
const wsBtnText = await sidebarBtns.nth(7).innerText();
console.log(`\nClicking button 7: "${wsBtnText.trim()}"`);

// Capture state before click
const beforeWorkspace = await page.evaluate(() => {
  const app = document.getElementById("jobclaw-application");
  if (!app) return "no app element";
  // Look for which sidebar nav button has active state (blue bg)
  const activeBtns = document.querySelectorAll("#jobclaw-sidebar .bg-blue-600\\/10");
  return activeBtns.length > 0 ? activeBtns[0].innerText.trim().slice(0, 20) : "none active";
});

await sidebarBtns.nth(7).click();
await page.waitForTimeout(1200);

events = await page.evaluate(() => window.__events);
console.log(`History events after click: ${events.length}`);
for (const e of events) console.log(`  ${e}`);

const afterState = await page.evaluate(() => {
  const activeBtns = document.querySelectorAll("#jobclaw-sidebar .bg-blue-600\\/10");
  return activeBtns.length > 0 ? activeBtns[0].innerText.trim().slice(0, 20) : "none active";
});
console.log(`Before: ${beforeWorkspace}, After: ${afterState}`);

const content = await page.locator("main").innerText();
console.log(`Content: ${content.slice(0, 200).replace(/\s+/g, " ").trim()}`);

// Check if page reloaded
const appExists = await page.locator("#jobclaw-application").count();
console.log(`#jobclaw-application exists: ${appExists > 0}`);

await browser.close();
