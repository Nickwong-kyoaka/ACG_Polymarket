import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  creatorSeries: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  post: { count: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
  creatorSeriesSubscription: { findUnique: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { ...mocks, $transaction: (operation: (tx: typeof mocks) => unknown) => operation(mocks) } }));

import {
  createCreatorSeries, createCreatorSeriesSchema, getPublicCreatorSeries, listMyCreatorSeries,
  setCreatorSeriesSubscription, updateCreatorSeries, updateCreatorSeriesSchema,
} from "@/lib/creator-series";

const series = {
  id: "series-1", slug: "evening-notes", creatorId: "owner", title: "Evening notes", description: "A continuing shelf of notes.",
  kind: "NOTE", published: true, createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("creator series ownership and privacy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.findUnique.mockResolvedValue({ id: "owner", creatorProfile: { status: "ACTIVE" } });
    mocks.creatorSeries.findFirst.mockResolvedValue(series);
    mocks.creatorSeries.create.mockImplementation(async ({ data }) => ({ ...series, ...data }));
    mocks.creatorSeries.update.mockImplementation(async ({ data }) => ({ ...series, ...data }));
    mocks.post.count.mockResolvedValue(1);
    mocks.post.findMany.mockResolvedValue([]);
    mocks.post.updateMany.mockResolvedValue({ count: 1 });
  });

  it("creates private series with the authenticated owner, including non-Latin titles", async () => {
    const result = await createCreatorSeries("owner", { title: "夜晚手帳" });
    expect(result.series).toMatchObject({ published: false, creatorId: "owner", kind: "NOTE", slug: expect.stringMatching(/^series-/) });
    expect(mocks.creatorSeries.create).toHaveBeenCalledWith({ data: expect.objectContaining({ creatorId: "owner", published: false }) });
  });

  it("rejects owner injection, invalid slugs, empty updates, and slug changes", () => {
    expect(createCreatorSeriesSchema.safeParse({ title: "Notes", creatorId: "victim" }).success).toBe(false);
    expect(createCreatorSeriesSchema.safeParse({ title: "Notes", slug: "../private" }).success).toBe(false);
    expect(updateCreatorSeriesSchema.safeParse({}).success).toBe(false);
    expect(updateCreatorSeriesSchema.safeParse({ slug: "new-address" }).success).toBe(false);
  });

  it("does not create a series for a stale session or suspended creator", async () => {
    mocks.user.findUnique.mockResolvedValueOnce(null);
    await expect(createCreatorSeries("owner", { title: "Notes" })).rejects.toMatchObject({ status: 401 });
    mocks.user.findUnique.mockResolvedValueOnce({ id: "owner", creatorProfile: { status: "SUSPENDED" } });
    await expect(createCreatorSeries("owner", { title: "Notes" })).rejects.toMatchObject({ status: 403 });
    expect(mocks.creatorSeries.create).not.toHaveBeenCalled();
  });

  it("scopes every patch to the authenticated owner and refuses someone else's series", async () => {
    mocks.creatorSeries.findFirst.mockResolvedValueOnce(null);
    await expect(updateCreatorSeries("intruder", "series-1", { title: "Stolen series" })).rejects.toMatchObject({ status: 404 });
    expect(mocks.creatorSeries.findFirst).toHaveBeenCalledWith({ where: { id: "series-1", creatorId: "intruder" } });
    expect(mocks.creatorSeries.update).not.toHaveBeenCalled();
  });

  it("updates publication visibility without changing post moderation or replacing membership", async () => {
    await updateCreatorSeries("owner", "series-1", { published: false });
    expect(mocks.creatorSeries.update).toHaveBeenCalledWith({ where: { id: "series-1", creatorId: "owner" }, data: { published: false } });
    expect(mocks.post.updateMany).not.toHaveBeenCalled();
  });

  it("only assigns owned non-removed posts, without changing their status", async () => {
    await updateCreatorSeries("owner", "series-1", { postIds: ["post-1"] });
    expect(mocks.post.count).toHaveBeenCalledWith({ where: { id: { in: ["post-1"] }, authorId: "owner", status: { not: "REMOVED" } } });
    expect(mocks.post.updateMany).toHaveBeenLastCalledWith({
      where: { id: { in: ["post-1"] }, authorId: "owner", status: { not: "REMOVED" } }, data: { creatorSeriesId: "series-1" },
    });
    mocks.post.updateMany.mockClear();
    mocks.post.count.mockResolvedValueOnce(0);
    await expect(updateCreatorSeries("owner", "series-1", { postIds: ["foreign-post"] })).rejects.toMatchObject({ status: 403 });
    expect(mocks.post.updateMany).not.toHaveBeenCalled();
  });

  it("filters public chapters by owner, published status, and nonfuture publication date", async () => {
    mocks.creatorSeries.findFirst.mockResolvedValue({ ...series, creator: { name: "Owner", profile: { displayName: "Creator", handle: "creator" } } });
    mocks.post.findMany.mockResolvedValue([{ id: "post", slug: "published", title: "A chapter", body: "x".repeat(400), language: "EN", kind: "NOTE", publishedAt: series.createdAt }]);
    mocks.creatorSeriesSubscription.findUnique.mockResolvedValue({ userId: "reader" });
    const result = await getPublicCreatorSeries("evening-notes", "reader");
    expect(mocks.creatorSeries.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ published: true, slug: "evening-notes" }) }));
    expect(mocks.post.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { creatorSeriesId: "series-1", authorId: "owner", status: "PUBLISHED", publishedAt: { lte: expect.any(Date) } }, take: 100,
    }));
    expect(result).toMatchObject({ subscribed: true, isOwner: false, series: { creator: { name: "Creator", handle: "creator" } } });
    expect(result.posts[0].body).toHaveLength(300);
    expect(result.posts[0].publishedAt).toBe(series.createdAt.toISOString());
    expect(JSON.stringify(result)).not.toContain("subscribers");
  });

  it("returns 404 for private or unavailable series without querying chapters", async () => {
    mocks.creatorSeries.findFirst.mockResolvedValue(null);
    await expect(getPublicCreatorSeries("private-series")).rejects.toMatchObject({ status: 404 });
    expect(mocks.post.findMany).not.toHaveBeenCalled();
  });

  it("retains assigned older posts in management even when outside the latest 100", async () => {
    mocks.creatorSeries.findMany.mockResolvedValue([{ ...series, posts: [{ id: "older", title: "Old chapter", status: "DRAFT", creatorSeriesId: series.id }], _count: { subscribers: 3 } }]);
    mocks.post.findMany.mockResolvedValue([{ id: "newer", title: "New chapter", status: "PUBLISHED", creatorSeriesId: null }]);
    const result = await listMyCreatorSeries("owner");
    expect(result.series[0]).toMatchObject({ postIds: ["older"], subscriberCount: 3 });
    expect(result.posts.map((post) => post.id)).toEqual(["newer", "older"]);
  });

  it("uses desired subscription state instead of toggling on retries", async () => {
    await setCreatorSeriesSubscription("reader", "series-1", true);
    await setCreatorSeriesSubscription("reader", "series-1", true);
    expect(mocks.creatorSeriesSubscription.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.creatorSeriesSubscription.upsert).toHaveBeenCalledWith({ where: { userId_seriesId: { userId: "reader", seriesId: "series-1" } }, create: { userId: "reader", seriesId: "series-1" }, update: {} });
  });

  it("allows unsubscribing after a series is made private", async () => {
    await expect(setCreatorSeriesSubscription("reader", "series-1", false)).resolves.toEqual({ subscribed: false });
    expect(mocks.creatorSeriesSubscription.deleteMany).toHaveBeenCalledWith({ where: { userId: "reader", seriesId: "series-1" } });
    expect(mocks.creatorSeries.findFirst).not.toHaveBeenCalled();
  });

  it("rejects subscriptions to private series and to the viewer's own series", async () => {
    await expect(setCreatorSeriesSubscription("owner", "series-1", true)).rejects.toMatchObject({ code: "OWN_SERIES" });
    mocks.creatorSeries.findFirst.mockResolvedValue(null);
    await expect(setCreatorSeriesSubscription("reader", "private", true)).rejects.toMatchObject({ status: 404 });
    expect(mocks.creatorSeriesSubscription.upsert).not.toHaveBeenCalled();
  });
});
