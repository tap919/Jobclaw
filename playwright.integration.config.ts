import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/mutly-integration.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    actionTimeout: 10000,
    navigationTimeout: 10000,
  },
});