import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findPost: vi.fn(), updatePost: vi.fn(), transaction: vi.fn(), prepareMedia: vi.fn(), profile: vi.fn(), analytics: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { post: { findFirst: mocks.findPost }, $transaction: mocks.transaction } }));
vi.mock("@/lib/post-media", () => ({ preparePostMedia: mocks.prepareMedia }));
import { createPostInputSchema, updateOwnPost } from "@/lib/social";

const input = () => createPostInputSchema.parse({ language: "en", title: "A saved page", body: "A meaningful little note.", intent: "DRAFT" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prepareMedia.mockImplementation(async (media) => media);
  mocks.findPost.mockResolvedValue({ id: "post-1", slug: "a-page", status: "HELD" });
  mocks.profile.mockResolvedValue({ status: "ACTIVE", approvedPostCount: 0, probationComplete: false });
  mocks.updatePost.mockImplementation(async ({ data }) => ({ id: "post-1", slug: "a-page", status: data.status, updatedAt: new Date("2026-11-04T00:00:00Z") }));
  mocks.transaction.mockImplementation(async (operation) => operation({ post: { findFirst: mocks.findPost, update: mocks.updatePost }, user: { findUnique: vi.fn().mockResolvedValue({ id: "owner" }) }, creatorProfile: { upsert: mocks.profile }, analyticsEvent: { create: mocks.analytics } }));
});

describe("owner draft and resubmission workflow", () => {
  it("rejects another member's post before downloading media", async () => {
    mocks.findPost.mockResolvedValue(null);
    await expect(updateOwnPost("intruder", "post-1", input())).rejects.toMatchObject({ status: 404 });
    expect(mocks.prepareMedia).not.toHaveBeenCalled();
    expect(mocks.updatePost).not.toHaveBeenCalled();
  });
  it("does not allow a removed post to bypass moderation by saving again", async () => {
    mocks.findPost.mockResolvedValue({ id: "post-1", status: "REMOVED" });
    await expect(updateOwnPost("owner", "post-1", input())).rejects.toMatchObject({ status: 403 });
    expect(mocks.prepareMedia).not.toHaveBeenCalled();
  });
  it("persists a private database draft and removes its publication timestamp", async () => {
    const result = await updateOwnPost("owner", "post-1", input());
    expect(result.post.status).toBe("DRAFT");
    expect(mocks.findPost).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "post-1", authorId: "owner" } }));
    expect(mocks.updatePost).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "DRAFT", publishedAt: null }) }));
  });
  it("returns a new author's corrected post to review instead of publishing it", async () => {
    const result = await updateOwnPost("owner", "post-1", { ...input(), intent: "SUBMIT" });
    expect(result.post.status).toBe("PENDING_REVIEW");
    expect(mocks.analytics).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "owner", name: "POST_SUBMITTED" }) }));
  });
  it("rejects caller-controlled author or moderation status", () => {
    expect(createPostInputSchema.safeParse({ ...input(), authorId: "other" }).success).toBe(false);
    expect(createPostInputSchema.safeParse({ ...input(), status: "PUBLISHED" }).success).toBe(false);
  });
});
