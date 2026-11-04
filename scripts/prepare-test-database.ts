import "dotenv/config";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl || !/(^|_)test($|_)/i.test(new URL(testDatabaseUrl).pathname.slice(1))) {
  throw new Error("Set TEST_DATABASE_URL to a disposable database whose name contains 'test'. No database was changed.");
}
const environment = { ...process.env, DATABASE_URL: testDatabaseUrl };
for (const args of [
  [resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
  [resolve("node_modules/tsx/dist/cli.mjs"), "prisma/bootstrap.ts"],
]) {
  const result = spawnSync(process.execPath, args, { env: environment, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
