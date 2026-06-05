import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("pageerror", err => console.log(`[PAGE_ERROR] ${err.message}`));
page.on("console", msg => {
  if (msg.type() === "error") console.log(`[CONSOLE_ERR] ${msg.text()}`);
});

let navCount = 0;
page.on("framenavigated", frame => {
  if (frame === page.mainFrame()) {
    navCount++;
    console.log(`[NAV#${navCount}] ${new URL(frame.url()).pathname}`);
  }
});

await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 15000 });
await page.waitForTimeout(2000);
console.log(`\nInitial navs: ${navCount}`);

// Wait for the data fetch to complete
await page.waitForSelector("text=JOBS FOUND", { timeout: 5000 }).catch(() => {});
console.log("Page stable.\n");

// Use getByRole for precision
const sidebar = page.locator("#jobclaw-sidebar");
const nav = page.locator("#jobclaw-sidebar nav");

// Log ALL button texts inside sidebar
const allBtns = sidebar.locator("button");
const count = await allBtns.count();
console.log("All sidebar buttons:");
for (let i = 0; i < count; i++) {
  const txt = await allBtns.nth(i).innerText();
  console.log(`  [${i}] "${txt.trim().replace(/\n/g, ' / ')}"`);
}
console.log();

// Click sidebar buttons by nth index
const targets = [
  { idx: 0, name: "Dashboard" },
  { idx: 1, name: "Career Vault" },
  { idx: 2, name: "Jobs" },
  { idx: 3, name: "Applications" },
  { idx: 6, name: "Autopilot" },
  { idx: 7, name: "Workspace Studio" },
];

for (const { idx, name } of targets) {
  const navBefore = navCount;
  const btn = allBtns.nth(idx);
  
  // Log the button's outer HTML for debugging
  const html = await btn.evaluate(el => el.outerHTML);
  
  await btn.click();
  await page.waitForTimeout(1200);
  
  // Check for content after click
  const mainText = await page.locator("main").innerText().catch(() => "");
  const snippet = mainText.replace(/\s+/g, " ").trim().slice(0, 180);
  
  console.log(`[${name}] idx=${idx} navs=${navCount - navBefore}`);
  console.log(`  Content: ${snippet}`);
  
  if (navCount - navBefore > 0) {
    console.log(`  BUTTON: ${html.slice(0, 200)}`);
  }
}

console.log(`\nTotal navigations: ${navCount}`);
await page.screenshot({ path: "navtest-precise.png" });
await browser.close();
