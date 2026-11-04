import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ asset: vi.fn(), intake: vi.fn(), retained: vi.fn(), normalized: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { characterAsset: { findFirst: mocks.asset }, postMedia: { findFirst: mocks.retained } } }));
vi.mock("@/lib/media-intake", () => ({ importRemotePostMedia: mocks.intake, isNormalizedPostMedia: mocks.normalized }));

import { preparePostMedia } from "@/lib/post-media";

const direct = { publicUrl: "https://images.example.org/a.png", sourceUrl: "https://artist.example.org/work", sourceLabel: "Artist", altText: "A sourced illustration" };
const retainedUrl = "https://app.example.org/api/post-media/12345678-1234-1234-1234-123456789abc";
const storedMedia = () => ({
  ...direct,
  publicUrl: retainedUrl,
  storageKey: "post-media/owner/12345678-1234-1234-1234-123456789abc.webp",
  status: "PENDING_REVIEW",
  post: { authorId: "creator", status: "HELD" },
});

describe("post media preparation", () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it("replaces external URLs with pipeline storage and leaves media in review", async () => {
    mocks.intake.mockResolvedValue({ publicUrl: "https://app.example.org/api/post-media/id", storageKey: "post-media/owner/id.webp" });
    const result = await preparePostMedia([direct], "creator");
    expect(mocks.intake).toHaveBeenCalledWith(direct.publicUrl, "creator");
    expect(result[0]).toEqual({ ...direct, publicUrl: "https://app.example.org/api/post-media/id", storageKey: "post-media/owner/id.webp" });
    expect(result[0]).not.toHaveProperty("assetId");
    expect(direct.publicUrl).toBe("https://images.example.org/a.png");
  });

  it("preserves published asset references without downloading them", async () => {
    mocks.asset.mockResolvedValue({ publicUrl: "https://cdn.example.org/approved.webp", storageKey: "approved.webp", derivatives: [] });
    expect(await preparePostMedia([{ assetId: "approved" }], "creator")).toEqual([{ assetId: "approved" }]);
    expect(mocks.asset).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "approved", workflowStatus: "PUBLISHED", contentRating: "SFW", permissionStatus: { notIn: ["REJECTED", "TAKEDOWN_REQUESTED"] } }) }));
    expect(mocks.intake).not.toHaveBeenCalled();
  });

  it("rejects forged storage keys, including apparently owner-bound keys", async () => {
    await expect(preparePostMedia([{ ...direct, storageKey: "post-media/owner/forged.webp" }], "creator")).rejects.toMatchObject({ code: "UNTRUSTED_STORAGE_KEY" });
    expect(mocks.intake).not.toHaveBeenCalled();
    await expect(preparePostMedia([{ ...direct, status: "APPROVED" }], "creator")).rejects.toMatchObject({ code: "INVALID_MEDIA" });
  });

  it("does not allow stale asset refs or reference/direct-media mixtures", async () => {
    mocks.asset.mockResolvedValue(null);
    await expect(preparePostMedia([{ assetId: "pulled" }], "creator")).rejects.toMatchObject({ code: "MEDIA_NOT_PUBLISHABLE" });
    await expect(preparePostMedia([{ ...direct, assetId: "approved" }], "creator")).rejects.toMatchObject({ code: "INVALID_MEDIA" });
  });

  it("propagates probe failures and rejects missing provenance", async () => {
    mocks.intake.mockRejectedValue(new Error("private host rejected"));
    await expect(preparePostMedia([direct], "creator")).rejects.toThrow("private host rejected");
    await expect(preparePostMedia([{ publicUrl: direct.publicUrl }], "creator")).rejects.toMatchObject({ code: "MEDIA_SOURCE_REQUIRED" });
  });

  it.each(["PENDING_REVIEW", "HELD"])("reuses the same owner's %s post imagery without a public fetch", async (postStatus) => {
    const stored = { ...storedMedia(), post: { authorId: "creator", status: postStatus } };
    mocks.retained.mockResolvedValue(stored);
    mocks.normalized.mockReturnValue(true);
    // A retained editor URL need not resend source fields or a storage key.
    const [result] = await preparePostMedia([{ publicUrl: retainedUrl }], "creator");
    expect(result).toEqual({ publicUrl: stored.publicUrl, storageKey: stored.storageKey, sourceUrl: stored.sourceUrl, sourceLabel: stored.sourceLabel, altText: stored.altText });
    expect(result).not.toHaveProperty("status");
    expect(result).not.toHaveProperty("assetId");
    expect(mocks.intake).not.toHaveBeenCalled();
    expect(mocks.normalized).toHaveBeenCalledWith(stored, "creator");
    expect(mocks.retained).toHaveBeenCalledWith(expect.objectContaining({ where: {
      publicUrl: retainedUrl, assetId: null, status: { in: ["PENDING_REVIEW", "APPROVED"] },
      post: { is: { authorId: "creator", status: { not: "REMOVED" } } },
    } }));
  });

  it("rejects another owner's retained URL without refetching it", async () => {
    mocks.retained.mockResolvedValue(null);
    await expect(preparePostMedia([{ publicUrl: retainedUrl }], "other-user")).rejects.toMatchObject({ code: "MEDIA_NOT_OWNED" });
    expect(mocks.retained).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ post: { is: { authorId: "other-user", status: { not: "REMOVED" } } } }) }));
    // Defense in depth if a stale/mismatched row is ever returned.
    mocks.retained.mockResolvedValue(storedMedia());
    mocks.normalized.mockReturnValue(true);
    await expect(preparePostMedia([{ publicUrl: retainedUrl }], "other-user")).rejects.toMatchObject({ code: "MEDIA_NOT_OWNED" });
    expect(mocks.intake).not.toHaveBeenCalled();
  });

  it.each(["REJECTED", "PULLED"])("never reuses %s media even for its owner", async (status) => {
    mocks.retained.mockResolvedValue({ ...storedMedia(), status });
    mocks.normalized.mockReturnValue(true);
    await expect(preparePostMedia([{ publicUrl: retainedUrl }], "creator")).rejects.toMatchObject({ code: "MEDIA_NOT_OWNED" });
    expect(mocks.intake).not.toHaveBeenCalled();
  });

  it("requires a matching database URL, live post, and validated pipeline key", async () => {
    mocks.retained.mockResolvedValue(storedMedia());
    mocks.normalized.mockReturnValue(false);
    await expect(preparePostMedia([{ publicUrl: retainedUrl }], "creator")).rejects.toMatchObject({ code: "MEDIA_NOT_OWNED" });
    mocks.normalized.mockReturnValue(true);
    mocks.retained.mockResolvedValue({ ...storedMedia(), publicUrl: "https://app.example.org/api/post-media/other" });
    await expect(preparePostMedia([{ publicUrl: retainedUrl }], "creator")).rejects.toMatchObject({ code: "MEDIA_NOT_OWNED" });
    mocks.retained.mockResolvedValue({ ...storedMedia(), post: { authorId: "creator", status: "REMOVED" } });
    await expect(preparePostMedia([{ publicUrl: retainedUrl }], "creator")).rejects.toMatchObject({ code: "MEDIA_NOT_OWNED" });
    expect(mocks.intake).not.toHaveBeenCalled();
  });

  it("accepts approved retained objects without carrying over approval or client provenance", async () => {
    mocks.retained.mockResolvedValue({ ...storedMedia(), status: "APPROVED" });
    mocks.normalized.mockReturnValue(true);
    const [result] = await preparePostMedia([{ ...direct, publicUrl: retainedUrl, sourceUrl: "https://forged.example.org", sourceLabel: "Forged attribution" }], "creator");
    expect(result).toMatchObject({ sourceUrl: direct.sourceUrl, sourceLabel: direct.sourceLabel });
    expect(result).not.toHaveProperty("status");
    expect(mocks.intake).not.toHaveBeenCalled();
  });

  it("still rejects a raw storage key alongside an otherwise valid retained URL", async () => {
    await expect(preparePostMedia([{ publicUrl: retainedUrl, storageKey: storedMedia().storageKey }], "creator")).rejects.toMatchObject({ code: "UNTRUSTED_STORAGE_KEY" });
    expect(mocks.retained).not.toHaveBeenCalled();
    expect(mocks.intake).not.toHaveBeenCalled();
  });
});
