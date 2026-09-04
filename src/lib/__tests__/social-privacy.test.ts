import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findPost: vi.fn(),
  findPosts: vi.fn(),
  findCollections: vi.fn(),
  userFollows: vi.fn(),
  characterFollows: vi.fn(),
  topicFollows: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: { findFirst: mocks.findPost, findMany: mocks.findPosts },
    collection: { findMany: mocks.findCollections },
    userFollow: { findMany: mocks.userFollows },
    characterFollow: { findMany: mocks.characterFollows },
    topicFollow: { findMany: mocks.topicFollows },
  },
}));

import { getPublicPost, getSocialFeed, listCollections } from "@/lib/social";

describe("social public query boundaries", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.userFollows.mockResolvedValue([]);
    mocks.characterFollows.mockResolvedValue([]);
    mocks.topicFollows.mockResolvedValue([]);
  });

  it("filters post details to published content and approved media", async () => {
    mocks.findPost.mockResolvedValue(null);
    await expect(getPublicPost("pending-post", "en", "viewer-1")).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });

    const query = mocks.findPost.mock.calls[0][0];
    expect(query.where).toMatchObject({ status: "PUBLISHED", publishedAt: { not: null } });
    expect(query.select.media.where.status).toBe("APPROVED");
    expect(query.select.author.select).not.toHaveProperty("email");
    expect(query.select.media.select).not.toHaveProperty("reviewedById");
    expect(query.select.media.select).not.toHaveProperty("reviewedAt");
  });

  it("loads a feed with one batched post query instead of per-item lookups", async () => {
    mocks.findPosts.mockResolvedValue([]);
    await getSocialFeed({ mode: "for-you", locale: "zh-Hant", viewerId: "viewer-1" });

    expect(mocks.findPosts).toHaveBeenCalledTimes(1);
    expect(mocks.userFollows).toHaveBeenCalledTimes(1);
    expect(mocks.characterFollows).toHaveBeenCalledTimes(1);
    expect(mocks.topicFollows).toHaveBeenCalledTimes(1);
    expect(mocks.findPosts.mock.calls[0][0].where.AND[0]).toMatchObject({
      status: "PUBLISHED",
      language: "ZH_HANT",
    });
  });

  it("lists only public collections unless the authenticated owner asks for mine", async () => {
    mocks.findCollections.mockResolvedValue([]);
    await listCollections({ locale: "en" });

    const publicQuery = mocks.findCollections.mock.calls[0][0];
    expect(publicQuery.where.AND).toContainEqual({ isPublic: true });
    expect(publicQuery.select.user.select).not.toHaveProperty("email");

    await listCollections({ locale: "en", mine: true, viewerId: "viewer-1" });
    const privateQuery = mocks.findCollections.mock.calls[1][0];
    expect(privateQuery.where.AND).toContainEqual({ userId: "viewer-1" });
  });
});
