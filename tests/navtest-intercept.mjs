import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Intercept window.location.reload
let reloadCalled = false;
await page.addInitScript(() => {
  const orig = window.location.__proto__;
  const proto = Object.getPrototypeOf(window.location);
  // Save original reload
  const origReload = proto.__lookupGetter__("reload") || (() => {});
  
  let reloadCount = 0;
  window.__reloadCount = () => reloadCount;
  
  // Replace reload with a noop that records
  Object.defineProperty(window, "location", {
    configurable: true,
    get() {
      return {
        get reload() {
          reloadCount++;
          console.log(`[RELOAD_CALLED x${reloadCount}]`);
          return () => { console.log("reload suppressed"); };
        },
        get href() { return "http://localhost:3000/"; },
        set href(v) { console.log(`[LOCATION_HREF_SET] ${v}`); },
        ...Object.fromEntries(Object.entries(orig).map(([k, v]) => [k, typeof v === "function" ? () => {} : v]))
      };
    }
  });
});

let navCount = 0;
page.on("framenavigated", frame => {
  if (frame === page.mainFrame()) navCount++;
});

await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(2000);
console.log(`Initial navs: ${navCount}`);

const sidebar = page.locator("#jobclaw-sidebar");
const sidebarBtns = sidebar.locator("button");

// Try clicking Workspace Studio directly after fresh load
console.log("\nClicking Workspace Studio (idx 7) directly:");
await sidebarBtns.nth(7).click();
await page.waitForTimeout(1000);
const reloadCount = await page.evaluate(() => window.__reloadCount());
console.log(`reload() called: ${reloadCount} times`);
console.log(`framenavigated: ${navCount}`);
const content = await page.locator("main").innerText();
console.log(`Content: ${content.slice(0, 200).replace(/\s+/g, " ").trim()}`);

await browser.close();
