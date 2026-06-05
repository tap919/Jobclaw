import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", msg => {
  if (msg.type() === "error") console.log(`[CONSOLE_ERROR] ${msg.text()}`);
});
page.on("pageerror", err => console.log(`[PAGE_ERROR] ${err.message}`));
page.on("crash", () => console.log("[CRASH]"));
page.on("framenavigated", frame => {
  if (frame === page.mainFrame()) {
    console.log(`[NAV] ${frame.url()}`);
  }
});

// Prevent real navigation to diagnose if it's Vite or code
// Intercept navigation requests
page.on("request", req => {
  if (req.isNavigationRequest() && req.url().includes("localhost:3000")) {
    console.log(`[NAV_REQ] ${req.method()} ${req.url()} ${JSON.stringify(req.headers())}`);
  }
});

await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.waitForTimeout(2000);

// Inject a global error handler
await page.evaluate(() => {
  window.addEventListener("error", (e) => {
    console.log("[WINDOW_ERROR]", e.message, e.error?.stack);
  });
  window.addEventListener("unhandledrejection", (e) => {
    console.log("[UNHANDLED_REJECTION]", e.reason);
  });
});

const sidebar = page.locator("#jobclaw-sidebar");
const buttons = sidebar.locator("button");

// Only test the 4 that reload
for (const idx of [1, 2, 3]) {
  const label = await buttons.nth(idx).innerText();
  console.log(`\n=== Testing button ${idx}: "${label.trim()}" ===`);
  
  await buttons.nth(idx).click();
  await page.waitForTimeout(500);
  
  // Check if page is still on same URL or navigated
  console.log(`URL: ${page.url()}`);
  console.log(`#jobclaw-application exists: ${await page.locator("#jobclaw-application").count() > 0}`);
  
  // Check for error boundary
  const errBoundary = page.locator("text=Application Error Detected");
  console.log(`ErrorBoundary shown: ${await errBoundary.count() > 0}`);
  
  // Check main content
  const mainText = await page.locator("main").innerText().catch(() => "<error>");
  console.log(`Content: ${mainText.slice(0, 200).replace(/\s+/g, " ").trim()}`);
  
  await page.waitForTimeout(2000);
}

await browser.close();
