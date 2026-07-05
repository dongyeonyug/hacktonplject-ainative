import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config (plan Verification Step 8 / Expanded Test Plan E2E row):
 * onboarding age-gate -> ai_processing consent -> chat -> recommendations.
 *
 * This project has no live Supabase project or ANTHROPIC_API_KEY in this
 * sandbox, so these specs are written to be **runnable once configured**
 * (see e2e/README.md) rather than faked to "pass" here. By default the
 * global setup skips the whole suite unless E2E_BASE_URL (or the local
 * webServer) plus real Supabase test-user credentials are present, so CI
 * does not silently report false positives against an unconfigured target.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // shared signed-in user state; specs run in sequence
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-375",
      // AC-5: explicit narrow-viewport project (<=375px) for the responsive pass.
      use: { ...devices["iPhone SE"], viewport: { width: 375, height: 667 } },
    },
  ],
  // Only auto-starts a dev server when running locally against a configured
  // .env.local; in an unconfigured environment `npm run build` there would
  // fail first anyway (see e2e/README.md), so this is safe to leave on.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
