import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  // Data requests retry with backoff when the backend is unreachable (as in CI), so allow for it.
  expect: { timeout: 15_000 },
  timeout: 60_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  // Mobile first: every test runs on phone viewports. Chromium is used for both so CI needs one browser.
  projects: [
    { name: "pixel-7", use: { ...devices["Pixel 7"] }, grepInvert: /@desktop/ },
    { name: "iphone-14", use: { ...devices["iPhone 14"], browserName: "chromium", defaultBrowserType: "chromium" }, grepInvert: /@desktop/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grep: /@desktop/ },
  ],
  webServer: {
    command: `PORT=${port} node scripts/serve.mjs`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
