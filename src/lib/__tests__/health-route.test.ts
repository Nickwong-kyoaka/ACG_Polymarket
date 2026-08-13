import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
  },
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    mocks.queryRaw.mockReset();
  });

  it("reports readiness when PostgreSQL is reachable", async () => {
    mocks.queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "ok", database: "reachable" });
  });

  it("returns 503 without exposing connection errors", async () => {
    mocks.queryRaw.mockRejectedValue(new Error("postgres://secret@database.example/internal"));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("database.example");
  });
});
