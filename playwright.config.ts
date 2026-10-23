import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    channel: process.env.CI ? "chromium" : "chrome",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    // Auth traces can contain credentials. Keep tracing disabled.
    trace: "off",
  },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3100/api/health/live",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
