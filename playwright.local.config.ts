import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/local",
  fullyParallel: false,
  forbidOnly: true,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { VITE_API_BASE_URL: "http://127.0.0.1:8080/api/v1" },
  },
});
