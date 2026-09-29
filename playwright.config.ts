import { defineConfig } from "@playwright/test";

import { SESSION } from "./tests/e2e/helpers";

/** The e2e suites: see tests/README.md. */

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  // In CI Playwright starts the production build itself; locally the tests
  // use the instance already running, as they always have. `next start` warns
  // about the standalone output but serves the build all the same.
  webServer: process.env.CI
    ? {
        command: "pnpm start",
        url: `${process.env.BASE_URL ?? "http://localhost:3000"}/login`,
        timeout: 60_000,
      }
    : undefined,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    // The Chrome already installed: no browser download.
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    // Logs in once; every other test starts from that session.
    { name: "login", testMatch: /auth\.setup\.ts/ },
    {
      name: "chrome",
      dependencies: ["login"],
      testIgnore: /impostazioni/,
      use: { storageState: SESSION },
    },
    // Changes the password everyone else logs in with: after all of them, one
    // test at a time — repeats included, which would otherwise race.
    {
      name: "password",
      dependencies: ["chrome"],
      testMatch: /impostazioni/,
      workers: 1,
      use: { storageState: SESSION },
    },
  ],
});
