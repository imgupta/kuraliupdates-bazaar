import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Local mock-browser tests use playwright.local.config.ts and must never be
  // discovered by the staging-targeted workflow below.
  testIgnore: ["**/local/**"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: !!process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://bazaar.kuraliupdates.com",
    trace: "retain-on-failure",
    screenshot: "on",
    video: "on",
    ...devices["Desktop Chrome"],
  },
});
