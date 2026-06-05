import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", msg => console.log(`[PAGE ${msg.type()}] ${msg.text()}`));

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

// Screenshot initial state
await page.screenshot({ path: "navtest-00-initial.png" });
console.log("--- INITIAL STATE ---");
console.log("URL:", page.url());
console.log("Title:", await page.title());
const bodyText = await page.locator("body").innerText();
console.log("Body text (first 500):", bodyText.slice(0, 500));

// Check which sidebar items exist and are visible
const navButtons = page.locator("#jobclaw-sidebar button");
const count = await navButtons.count();
console.log(`\nSidebar buttons found: ${count}`);
for (let i = 0; i < count; i++) {
  const txt = await navButtons.nth(i).innerText();
  console.log(`  [${i}] "${txt}"`);
}

// Check main content area
const main = page.locator("main");
console.log("\nMain content visible:", await main.isVisible());

// Check what workspace-related text is on the page
const wsText = await page.locator("#jobclaw-application").innerText();
console.log("\nFull app text (first 800):", wsText.slice(0, 800));

// Now click each sidebar button and check what happens
const sidebar = page.locator("#jobclaw-sidebar");
const buttons = sidebar.locator("button");
const btnCount = await buttons.count();

for (let i = 0; i < btnCount; i++) {
  const label = await buttons.nth(i).innerText();
  // skip footer buttons (user avatar area)
  if (!label || label.trim() === "" || label.includes("LIVE") || label.includes("DEMO") || label.includes("Gemini")) continue;
  console.log(`\n--- CLICKING: "${label.trim()}" (index ${i}) ---`);
  await buttons.nth(i).click();
  await page.waitForTimeout(800);
  const mainText = await page.locator("main").innerText();
  console.log("Main content after click (first 400):", mainText.slice(0, 400).replace(/\s+/g, " ").trim());
  await page.screenshot({ path: `navtest-${String(i + 1).padStart(2, "0")}-${label.trim().toLowerCase().replace(/\s+/g, "-")}.png` });
}

await browser.close();
console.log("\nDone.");
