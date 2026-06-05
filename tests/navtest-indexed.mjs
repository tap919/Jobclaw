import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Track ALL navigations with reason
page.on("framenavigated", frame => {
  if (frame === page.mainFrame()) {
    console.log(`[NAV] ${frame.url()}`);
  }
});

// Track page errors
page.on("pageerror", err => console.log(`[PAGE_ERR] ${err.message}`));

// Track requests
page.on("request", req => {
  const url = req.url();
  if (url.includes("localhost:3000") && !url.includes("vite") && !url.includes("__open-in-editor")) {
    console.log(`[REQ] ${req.method()} ${url}`);
  }
});

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

console.log("\n=== Initial state check ===");
const sidebar = page.locator("#jobclaw-sidebar");
const buttons = sidebar.locator("button");
const btnCount = await buttons.count();
console.log(`Sidebar buttons: ${btnCount}`);

// Click by index using nth() to avoid selector ambiguity
const clicks = [
  { index: 0, label: "Dashboard (sidebar)" },
  { index: 1, label: "Career Vault" },
  { index: 2, label: "Jobs" },
  { index: 3, label: "Applications" },
  { index: 4, label: "Resume Studio" },
  { index: 5, label: "Sector Packs" },
  { index: 6, label: "Autopilot Console" },
  { index: 7, label: "Workspace Studio" },
  { index: 8, label: "Analytics" },
  { index: 9, label: "Settings" },
];

for (const { index, label } of clicks) {
  console.log(`\n[CLICK] "${label}" (button index ${index})`);
  
  // Get button text to verify
  const btnText = await buttons.nth(index).innerText().catch(() => "<error>");
  console.log(`  Button text: "${btnText.trim()}"`);
  
  // Click
  await buttons.nth(index).click();
  await page.waitForTimeout(1000);
  
  // Check main content
  const mainText = await page.locator("main").innerText().catch(() => "<error>");
  console.log(`  Content: ${mainText.slice(0, 300).replace(/\s+/g, " ").trim()}`);
  
  // Check URL
  console.log(`  URL: ${page.url()}`);
}

await page.screenshot({ path: "navtest-final2.png" });
await browser.close();
console.log("\nDone.");
