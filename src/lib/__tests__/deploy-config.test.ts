import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../..");
const renderYaml = fs.readFileSync(path.join(repoRoot, "render.yaml"), "utf8");
const envExample = fs.readFileSync(path.join(repoRoot, ".env.example"), "utf8");

describe("Render deployment support", () => {
  it("declares a main-branch Node web service for the Next.js app", () => {
    expect(renderYaml).toContain("type: web");
    expect(renderYaml).toContain("runtime: node");
    expect(renderYaml).toContain("branch: main");
    expect(renderYaml).toContain("buildCommand: npm ci && npm run prisma:generate && npm run build");
    expect(renderYaml).toContain("startCommand: npm run start -- -H 0.0.0.0 -p $PORT");
  });

  it("keeps deployment secrets out of source control", () => {
    expect(renderYaml).toContain("key: DATABASE_URL");
    expect(renderYaml).toContain("sync: false");
    expect(renderYaml).toContain("key: AUTH_SECRET");
    expect(renderYaml).toContain("generateValue: true");
  });

  it("documents the MVP environment contract", () => {
    for (const key of [
      "DATABASE_URL",
      "NEXTAUTH_URL",
      "NEXTAUTH_SECRET",
      "ADMIN_EMAILS",
      "BANGUMI_USER_AGENT",
      "ADS_PROVIDER",
      "GOOGLE_AD_CLIENT",
      "S3_PUBLIC_BASE_URL",
      "DEMO_MODE",
    ]) {
      expect(envExample).toContain(`${key}=`);
    }
  });
});
