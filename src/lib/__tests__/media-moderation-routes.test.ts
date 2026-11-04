import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationError } from "@/lib/api";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), decide: vi.fn(), list: vi.fn(), media: vi.fn(), normalized: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdminSessionUserId: mocks.admin }));
vi.mock("@/lib/prisma", () => ({ prisma: { postMedia: { findFirst: mocks.media, findUnique: mocks.media } } }));
vi.mock("@/lib/media-intake", () => ({ isNormalizedPostMedia: mocks.normalized, readPrivatePostMedia: mocks.read }));
vi.mock("@/lib/report-moderation", async (original) => ({ ...(await original<object>()), decideReport: mocks.decide, listModerationReports: mocks.list }));
import { PATCH } from "@/app/api/admin/reports/[id]/route";
import { GET as listReports } from "@/app/api/admin/reports/route";
import { GET as publicMedia } from "@/app/api/post-media/[id]/route";
import { GET as adminMedia } from "@/app/api/admin/post-media/[id]/route";
const context = { params: Promise.resolve({ id: "12345678-1234-1234-1234-123456789abc" }) };
const request = (body: unknown) => new Request("https://app.example.org/api/admin/reports/report-1", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("media and moderation authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.admin.mockResolvedValue("admin"); mocks.list.mockResolvedValue([]);
    mocks.media.mockResolvedValue(null); mocks.read.mockResolvedValue(new Uint8Array([1, 2])); mocks.normalized.mockReturnValue(true);
  });
  it("requires admin identity before report reads/writes or quarantine previews", async () => {
    mocks.admin.mockRejectedValue(new AuthenticationError());
    expect((await PATCH(request({ decision: "REMOVE", note: "Policy violation." }), context)).status).toBe(401);
    expect((await listReports(new Request("https://app.example.org/api/admin/reports"))).status).toBe(401);
    expect((await adminMedia(new Request("https://app.example.org/preview"), context)).status).toBe(401);
    expect(mocks.decide).not.toHaveBeenCalled(); expect(mocks.list).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled();
  });
  it("does not accept body-supplied actor, status, or arbitrary decisions", async () => {
    expect((await PATCH(request({ decision: "REMOVE", note: "Policy violation.", actorUserId: "forged", status: "RESOLVED" }), context)).status).toBe(422);
    expect(mocks.decide).not.toHaveBeenCalled();
    mocks.decide.mockResolvedValue({ report: { status: "RESOLVED" } });
    expect((await PATCH(request({ decision: "REMOVE", note: "Policy violation." }), context)).status).toBe(200);
    expect(mocks.decide).toHaveBeenCalledWith("admin", expect.any(String), { decision: "REMOVE", note: "Policy violation." });
  });
  it("does not expose quarantined imagery through the public route", async () => {
    expect((await publicMedia(new Request("https://app.example.org/media"), context)).status).toBe(404);
    expect(mocks.media).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "APPROVED", assetId: null, post: { is: { status: "PUBLISHED", publishedAt: { not: null } } } }) }));
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("serves approved bytes without caching, and rejects owner-key mismatches", async () => {
    mocks.media.mockResolvedValue({ storageKey: "post-media/owner/id.webp", publicUrl: "https://app.example.org/api/post-media/id", post: { authorId: "creator" } });
    const response = await publicMedia(new Request("https://app.example.org/media"), context);
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    mocks.normalized.mockReturnValue(false);
    expect((await publicMedia(new Request("https://app.example.org/media"), context)).status).toBe(404);
  });
});
