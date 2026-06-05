import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Monitor for full page reloads
let reloads = [];
page.on("request", req => {
  if (req.isNavigationRequest()) {
    reloads.push({ url: req.url(), time: Date.now() });
  }
});

let navEvents = 0;
page.on("framenavigated", frame => {
  if (frame === page.mainFrame()) navEvents++;
});

await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 15000 });
await page.waitForTimeout(3000);

// Reset after initial load
const initialNavEvents = navEvents;
navEvents = 0;
reloads = [];
let contentChanges = 0;
let prevContent = "";

for (let i = 0; i < 15; i++) {
  await page.waitForTimeout(1000);
  const cur = await page.locator("#jobclaw-application").innerText().catch(() => "");
  if (prevContent && cur !== prevContent) contentChanges++;
  prevContent = cur;
}

await page.screenshot({ path: "blink-test-15s.png" });

console.log(`Navigation requests in 15s: ${reloads.length}`);
for (const r of reloads) console.log(`  ${new Date(r.time).toISOString().slice(11,19)} ${r.url}`);
console.log(`framenavigated events in 15s: ${navEvents}`);
console.log(`Content changes in 15s: ${contentChanges}`);
console.log(`Verdict: ${contentChanges === 0 ? "NO BLINKING ✓" : "BLINKING DETECTED ✗"}`);

await browser.close();
process.exit(contentChanges > 0 ? 1 : 0);
