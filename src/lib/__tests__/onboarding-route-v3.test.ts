import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationError } from "@/lib/api";

const mocks = vi.hoisted(() => ({
  requireSessionUserId: vi.fn(),
  characterFindMany: vi.fn(),
  profileUpdate: vi.fn(),
  followDeleteMany: vi.fn(),
  followCreateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireSessionUserId: mocks.requireSessionUserId }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    character: { findMany: mocks.characterFindMany },
    $transaction: mocks.transaction,
  },
}));

import { POST } from "@/app/api/me/onboarding/route";

function request(body: unknown) {
  return new Request("http://localhost/api/me/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("POST /api/me/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUserId.mockResolvedValue("viewer-1");
    mocks.characterFindMany.mockResolvedValue([{ id: "char-akari" }, { id: "char-frieren" }]);
    mocks.profileUpdate.mockResolvedValue({ handle: "viewer", favoriteTags: ["new-season"], preferredLocale: "ZH_HANT", onboardingCompletedAt: new Date("2026-09-04T12:00:00.000Z") });
    mocks.followDeleteMany.mockResolvedValue({ count: 0 });
    mocks.followCreateMany.mockResolvedValue({ count: 2 });
    mocks.transaction.mockImplementation((operation: (tx: unknown) => unknown) => operation({ profile: { update: mocks.profileUpdate }, characterFollow: { deleteMany: mocks.followDeleteMany, createMany: mocks.followCreateMany } }));
  });

  it("uses session identity and persists locale, interests, and character follows", async () => {
    const response = await POST(request({ locale: "zh-Hant", favoriteTags: ["new-season"], characterIds: ["char-akari", "char-frieren"] }));
    expect(response.status).toBe(200);
    expect(mocks.profileUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "viewer-1" }, data: expect.objectContaining({ preferredLocale: "ZH_HANT", favoriteTags: ["new-season"], onboardingCompletedAt: expect.any(Date) }) }));
    expect(mocks.followCreateMany).toHaveBeenCalledWith({ data: [{ userId: "viewer-1", characterId: "char-akari" }, { userId: "viewer-1", characterId: "char-frieren" }], skipDuplicates: true });
    expect(response.headers.get("set-cookie")).toContain("acg-locale=zh-Hant");
  });

  it("returns 401 without mutating state when no session exists", async () => {
    mocks.requireSessionUserId.mockRejectedValue(new AuthenticationError());
    const response = await POST(request({ locale: "en", favoriteTags: ["fan-creation"], characterIds: ["char-akari"] }));
    expect(response.status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects unavailable character ids before the transaction", async () => {
    mocks.characterFindMany.mockResolvedValue([{ id: "char-akari" }]);
    const response = await POST(request({ locale: "en", favoriteTags: ["fan-creation"], characterIds: ["char-akari", "missing"] }));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_CHARACTER_SELECTION" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
