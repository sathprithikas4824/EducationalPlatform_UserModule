import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  // Parallel workers compete with the single dev server (Turbopack recompiles +
  // real network calls per page) and cause spurious timeouts under load — this
  // suite is small enough that running serially is both fast and reliable.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Reuses an already-running `pnpm dev` server if present (common while iterating
  // locally); otherwise starts one itself for a clean CI run.
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3001",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});