import { defineConfig, devices } from "@playwright/test";

// E2E against the dev server and the real DB in .env. Each run signs up a throwaway shop
// (e2e-*@stocksense.test) and the global teardown deletes it, so demo data is untouched.
const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  globalTeardown: "./tests/e2e/teardown.ts",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Pixel 7"],
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
