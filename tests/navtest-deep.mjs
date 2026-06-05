import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let mutationCount = 0;
await page.exposeFunction("onMutation", () => { mutationCount++; });

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

// Track DOM mutations in main content area
await page.evaluate(() => {
  const target = document.querySelector("main") || document.body;
  const observer = new MutationObserver(() => {
    window['onMutation']();
  });
  observer.observe(target, { childList: true, subtree: true, attributes: true, characterData: true });
});

// Monitor for 5 seconds
console.log("Monitoring DOM mutations for 5 seconds...");
await page.waitForTimeout(5000);
console.log(`DOM mutations in 5s on Dashboard: ${mutationCount}`);

// Now click each workspace-changing sidebar item and monitor
const sidebarButtons = ["Autopilot Console", "Workspace Studio", "Settings"];
for (const label of sidebarButtons) {
  mutationCount = 0;
  await page.click(`#jobclaw-sidebar button:has-text("${label}")`);
  await page.waitForTimeout(1000);
  
  console.log(`\nAfter clicking "${label}":`);
  console.log(`  DOM mutations in 1s: ${mutationCount}`);
  
  // Wait and monitor for 3s
  mutationCount = 0;
  await page.waitForTimeout(3000);
  console.log(`  DOM mutations in 3s (steady state): ${mutationCount}`);
  
  // Check # jobclaw-application exists
  const appExists = await page.locator("#jobclaw-application").count();
  console.log(`  #jobclaw-application exists: ${appExists > 0}`);
  
  // Check main content text
  const mainText = await page.locator("main").innerText();
  console.log(`  Main content (first 200): ${mainText.slice(0, 200).replace(/\s+/g, " ").trim()}`);
}

// Go back to Dashboard and check for blinks
mutationCount = 0;
await page.click(`#jobclaw-sidebar button:has-text("Dashboard")`);
await page.waitForTimeout(1000);
console.log(`\nBack to Dashboard - mutations in 1s: ${mutationCount}`);

// Now the real test: sequential rapid clicks to simulate user behavior
console.log("\n--- Simulating rapid navigation ---");
for (let round = 0; round < 3; round++) {
  for (const label of ["Jobs", "Applications", "Career Vault", "Dashboard"]) {
    mutationCount = 0;
    await page.click(`#jobclaw-sidebar button:has-text("${label}")`);
    await page.waitForTimeout(300);
    console.log(`Round ${round + 1}: Clicked "${label}" -> ${mutationCount} mutations in 300ms`);
  }
}

// Final check after rapid navigation
await page.waitForTimeout(2000);
const finalMain = await page.locator("main").innerText();
console.log(`\nFinal state: ${finalMain.slice(0, 150).replace(/\s+/g, " ").trim()}`);
await page.screenshot({ path: "navtest-final.png" });

// Check for any visible "blink" - alternating content
console.log("\n--- Content stability check ---");
const sample1 = await page.locator("#jobclaw-application").innerText();
await page.waitForTimeout(100);
const sample2 = await page.locator("#jobclaw-application").innerText();
await page.waitForTimeout(100);
const sample3 = await page.locator("#jobclaw-application").innerText();
console.log(`Sample 1 == Sample 2: ${sample1 === sample2}`);
console.log(`Sample 2 == Sample 3: ${sample2 === sample3}`);

await browser.close();
console.log("\nDone.");
