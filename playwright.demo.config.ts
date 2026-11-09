import { defineConfig, devices } from "@playwright/test";

process.env.PLAYWRIGHT_DEMO_SUITE = "true";
process.env.APP_ENV = "development";
process.env.SHOGHLY_DEMO_MODE = "true";
const port = Number(process.env.PORT ?? 3010);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "demo-mode.spec.ts",
  globalSetup: "./scripts/playwright-demo-global-setup.mjs",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "demo-chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "demo-mobile-chromium",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
});
