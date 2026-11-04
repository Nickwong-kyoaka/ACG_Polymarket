import { defineConfig, devices } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !/(^|_)test($|_)/i.test(new URL(databaseUrl).pathname.slice(1))) {
  throw new Error("Browser tests require TEST_DATABASE_URL pointing to an isolated test database.");
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- -H 127.0.0.1 -p 3100",
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: false,
    timeout: 180_000,
    env: { DATABASE_URL: databaseUrl, NEXTAUTH_URL: "http://127.0.0.1:3100", AUTH_SECRET: "e2e-only-secret-not-for-public-use", NEXTAUTH_SECRET: "e2e-only-secret-not-for-public-use", MARKET_QUOTE_SECRET: "e2e-only-quote-secret-not-for-public-use", DEMO_MODE: "true", DEMO_USER_ID: "viewer-001", ADS_PROVIDER: "mock" },
  },
});
