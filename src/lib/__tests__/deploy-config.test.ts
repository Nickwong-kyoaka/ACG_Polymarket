import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../..");
const renderYaml = fs.readFileSync(path.join(repoRoot, "render.yaml"), "utf8");
const normalizedRenderYaml = renderYaml.replace(/\r\n/g, "\n");
const envExample = fs.readFileSync(path.join(repoRoot, ".env.example"), "utf8");
const dockerfile = fs.readFileSync(path.join(repoRoot, "Dockerfile"), "utf8");
const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8");

function yamlCommand(name: string) {
  return normalizedRenderYaml.match(new RegExp(`^[ \\t]*${name}:[ \\t]*(.+)$`, "m"))?.[1];
}

describe("Render deployment support", () => {
  it("declares a main-branch Node web service for the Next.js app", () => {
    expect(renderYaml).toContain("type: web");
    expect(renderYaml).toContain("runtime: node");
    expect(renderYaml).toContain("branch: main");
    expect(yamlCommand("buildCommand")).toBe("npm ci && npm run prisma:generate && npm run build");
    expect(yamlCommand("buildCommand")).not.toMatch(/db:push|db:seed|migrate/);
    expect(yamlCommand("startCommand")).toBe(
      "npx prisma migrate deploy && npm run media:sync-approved && npm run start -- -H 0.0.0.0 -p $PORT",
    );
    expect(yamlCommand("initialDeployHook")).toBe("npm run db:seed");
    expect(yamlCommand("healthCheckPath")).toBe("/api/health");
  });

  it("keeps deployment secrets out of source control", () => {
    expect(renderYaml).toContain("key: DATABASE_URL");
    expect(renderYaml).toContain("sync: false");
    expect(renderYaml).toContain("key: AUTH_SECRET");
    expect(renderYaml).toContain("generateValue: true");
    expect(normalizedRenderYaml).toContain('key: DEMO_MODE\n        value: "false"');
    expect(normalizedRenderYaml).toContain('key: DEMO_ADMIN_ENABLED\n        value: "false"');
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
      "DEMO_ADMIN_ENABLED",
      "AUTH_GOOGLE_ID",
      "AUTH_GOOGLE_SECRET",
    ]) {
      expect(envExample).toContain(`${key}=`);
    }

    expect(envExample).toContain('DEMO_MODE="false"');
    expect(envExample).toContain('DEMO_ADMIN_ENABLED="false"');
  });

  it("runs migrations at runtime and migration smoke tests in CI", () => {
    expect(dockerfile).toContain("npx prisma migrate deploy && npm run media:sync-approved && npm run start");
    expect(dockerfile).toContain("/api/health");
    expect(workflow).toContain("npx prisma migrate deploy");
    expect(workflow).toContain("npx prisma migrate status");
    expect(workflow).toContain(
      "npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code",
    );
    expect(workflow).not.toContain("prisma db push");
  });
});
