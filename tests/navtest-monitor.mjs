import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Capture all console messages
const consoleErrors = [];
page.on("console", msg => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

// Capture page errors
const pageErrors = [];
page.on("pageerror", err => pageErrors.push(err.message));

let navigationCount = 0;
page.on("framenavigated", frame => {
  if (frame === page.mainFrame()) navigationCount++;
});

let viteReconnects = 0;
page.on("websocket", ws => {
  const url = ws.url();
  if (url.includes("vite")) {
    ws.on("socketerror", () => viteReconnects++);
  }
});

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

console.log("=== Initial Load ===");
console.log(`Navigations: ${navigationCount}`);
console.log(`Vite WS errors: ${viteReconnects}`);
console.log(`Page errors: ${pageErrors.length}`);
for (const e of pageErrors) console.log(`  ERR: ${e}`);
console.log(`Console errors: ${consoleErrors.length}`);
for (const e of consoleErrors) console.log(`  CONSOLE: ${e}`);

// Monitor for 10 seconds on initial screen
console.log("\n=== Monitoring Dashboard for 10s ===");
let snapshot1 = await page.locator("#jobclaw-application").innerText();
let changes = 0;
for (let s = 0; s < 10; s++) {
  await page.waitForTimeout(1000);
  const snapshot = await page.locator("#jobclaw-application").innerText();
  if (snapshot !== snapshot1) {
    changes++;
    console.log(`Content changed at second ${s + 1}!`);
    snapshot1 = snapshot;
  }
}
console.log(`Content changes in 10s: ${changes}`);

// Click sidebar items and monitor each for 5 seconds
const items = ["Jobs", "Applications", "Career Vault", "Autopilot Console", "Workspace Studio", "Dashboard"];
for (const label of items) {
  console.log(`\n=== Clicking "${label}" ===`);
  const navBefore = navigationCount;
  const errBefore = pageErrors.length;
  
  await page.click(`#jobclaw-sidebar button:has-text("${label}")`);
  await page.waitForTimeout(2000);
  
  console.log(`Navigations: ${navigationCount - navBefore}`);
  console.log(`New errors: ${pageErrors.length - errBefore}`);
  
  // Monitor for content flicker
  let flickers = 0;
  let prevContent = await page.locator("#jobclaw-application").innerText();
  for (let s = 0; s < 5; s++) {
    await page.waitForTimeout(200);
    const cur = await page.locator("#jobclaw-application").innerText();
    if (cur !== prevContent) {
      flickers++;
      prevContent = cur;
    }
  }
  console.log(`Flickers in 1s: ${flickers}`);
  
  const mainText = await page.locator("main").innerText();
  const wc = mainText.slice(0, 150).replace(/\s+/g, " ").trim();
  console.log(`Content: ${wc}`);
}

console.log("\n=== Final Summary ===");
console.log(`Total navigations: ${navigationCount}`);
console.log(`Total page errors: ${pageErrors.length}`);
for (const e of pageErrors) console.log(`  ${e}`);
console.log(`Total console errors: ${consoleErrors.length}`);
for (const e of consoleErrors) console.log(`  ${e}`);

await browser.close();
console.log("\nDone.");
