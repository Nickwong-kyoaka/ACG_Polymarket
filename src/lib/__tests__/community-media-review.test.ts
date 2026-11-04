import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), read: vi.fn(), write: vi.fn(), creatorRead: vi.fn(), creatorWrite: vi.fn(), prior: vi.fn(), audit: vi.fn(), notify: vi.fn(), normalized: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/lib/media-intake", () => ({ isNormalizedPostMedia: mocks.normalized }));
vi.mock("@/lib/engagement", () => ({ notifyPostFollowers: vi.fn() }));
import { reviewCommunityPost } from "@/lib/catalog-community";
const post = { id: "post-1", authorId: "creator", slug: "post", language: "ZH_HANT", status: "PENDING_REVIEW", title: "Title", body: "Body", publishedAt: null, createdAt: new Date(), updatedAt: new Date(), media: [{ assetId: null, asset: null, status: "PENDING_REVIEW", altText: "Illustration", sourceLabel: "Artist", sourceUrl: "https://artist.example.org", publicUrl: "https://app.example.org/api/post-media/id", storageKey: "post-media/owner/id.webp" }] };
describe("media publishing review", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.read.mockResolvedValue(post); mocks.write.mockResolvedValue({ ...post, status: "PUBLISHED" });
    mocks.creatorRead.mockResolvedValue({ status: "ACTIVE", approvedPostCount: 1 }); mocks.prior.mockResolvedValue(null); mocks.normalized.mockReturnValue(true);
    mocks.transaction.mockImplementation(async (work) => work({ post: { findUnique: mocks.read, update: mocks.write }, creatorProfile: { findUnique: mocks.creatorRead, upsert: mocks.creatorWrite }, contributorTrustEvent: { findFirst: mocks.prior, create: mocks.audit }, notification: { create: mocks.notify } }));
  });
  it("rejects legacy raw URLs that did not pass normalization", async () => {
    mocks.normalized.mockReturnValue(false);
    await expect(reviewCommunityPost("admin", post.id, { decision: "APPROVE", note: "Checked" })).rejects.toMatchObject({ code: "MEDIA_REVIEW_INCOMPLETE" });
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("only credits the first approval of a unique post", async () => {
    await reviewCommunityPost("admin", post.id, { decision: "APPROVE", note: "Checked" });
    expect(mocks.creatorWrite).toHaveBeenCalledWith(expect.objectContaining({ update: { approvedPostCount: 2, probationComplete: false } }));
    mocks.creatorWrite.mockClear(); mocks.prior.mockResolvedValue({ id: "existing-approval" });
    await reviewCommunityPost("admin", post.id, { decision: "APPROVE", note: "Checked again" });
    expect(mocks.creatorWrite).not.toHaveBeenCalled();
    expect(mocks.audit).toHaveBeenLastCalledWith({ data: expect.objectContaining({ points: 0 }) });
  });
  it("sends held/rejected authors to their localized private desk", async () => {
    await reviewCommunityPost("admin", post.id, { decision: "REQUEST_CHANGES", note: "Please correct the source." });
    expect(mocks.notify).toHaveBeenCalledWith({ data: expect.objectContaining({ href: "/zh-Hant/me/posts?post=post-1" }) });
  });
  it("does not approve a suspended creator or re-credit an already published post", async () => {
    mocks.creatorRead.mockResolvedValue({ status: "SUSPENDED" });
    await expect(reviewCommunityPost("admin", post.id, { decision: "APPROVE", note: "Checked" })).rejects.toMatchObject({ code: "CREATOR_SUSPENDED" });
    mocks.read.mockResolvedValue({ ...post, status: "PUBLISHED" });
    expect(await reviewCommunityPost("admin", post.id, { decision: "APPROVE", note: "Checked" })).toMatchObject({ replayed: true });
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
