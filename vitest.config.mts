import path from "node:path";
import { defineConfig } from "vitest/config";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) {
  const databaseName = new URL(testDatabaseUrl).pathname.slice(1);
  if (!/(^|_)test($|_)/i.test(databaseName)) {
    throw new Error("TEST_DATABASE_URL must point to a database with 'test' in its name.");
  }
}
// Never allow dotenv or a developer's production connection to select the test database.
process.env.DATABASE_URL = testDatabaseUrl ?? "postgresql://postgres:postgres@127.0.0.1:1/acg_test_disabled";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/**"],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
