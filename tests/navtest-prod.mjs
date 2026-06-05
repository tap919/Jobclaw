import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let navCount = 0;
page.on("framenavigated", frame => {
  if (frame === page.mainFrame()) navCount++;
});

let errors = [];
page.on("pageerror", err => errors.push(err.message));
page.on("console", msg => {
  if (msg.type() === "error") errors.push(`[CONSOLE] ${msg.text()}`);
});

await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 15000 });
await page.waitForTimeout(2000);
console.log(`Initial navigations: ${navCount}, errors: ${errors.length}`);

// Monitor DOM for 10s
const app = page.locator("#jobclaw-application");
let snapshots = [];
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(1000);
  const text = await app.innerText().catch(() => "");
  snapshots.push(text.slice(0, 100));
}
let changes = 0;
for (let i = 1; i < snapshots.length; i++) {
  if (snapshots[i] !== snapshots[i-1]) changes++;
}
console.log(`DOM changes in 10s: ${changes}`);
console.log(`Errors: ${errors.length}`);

// Navigate and check each workspace
const sidebar = page.locator("#jobclaw-sidebar");
const sidebarItems = ["Dashboard", "Jobs", "Applications", "Career Vault", "Autopilot Console", "Workspace Studio"];

for (const label of sidebarItems) {
  const navBefore = navCount;
  const errBefore = errors.length;
  
  await sidebar.locator(`button:has-text("${label}")`).click();
  await page.waitForTimeout(1500);
  
  const mainText = await page.locator("main").innerText().catch(() => "");
  console.log(`\n[${label}] navigations: ${navCount - navBefore}, new errors: ${errors.length - errBefore}`);
  console.log(`  Content: ${mainText.slice(0, 200).replace(/\s+/g, " ").trim()}`);
}

console.log(`\nTotal navigations: ${navCount}, Total errors: ${errors.length}`);
for (const e of errors) console.log(`  ${e}`);

await page.screenshot({ path: "navtest-prod.png" });
await browser.close();
