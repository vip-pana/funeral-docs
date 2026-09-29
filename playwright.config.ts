import { defineConfig } from "@playwright/test";

/**
 * The e2e suites being moved to Playwright Test, one at a time; the rest still
 * run through tests/run.mts. Both drive an instance already listening at
 * BASE_URL (see tests/README.md).
 */
const session = "tests/e2e/.auth/session.json";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    // The Chrome already installed, as the old suites do: no browser download.
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    // Logs in once; every other test starts from that session.
    { name: "login", testMatch: /auth\.setup\.ts/ },
    {
      name: "chrome",
      dependencies: ["login"],
      use: { storageState: session },
    },
  ],
});
