import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ characters: vi.fn(), posts: vi.fn(), series: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { character: { findMany: mocks.characters }, post: { findMany: mocks.posts }, series: { findMany: mocks.series } } }));
import { normalizeSearchQuery, searchPublicContent } from "@/lib/public-search";
beforeEach(() => { vi.stubEnv("FEATURE_COMMUNITY", "true"); for (const mock of Object.values(mocks)) mock.mockReset().mockResolvedValue([]); });
afterEach(() => vi.unstubAllEnvs());

describe("public search boundaries (mocked persistence only)", () => {
  it("does not query posts or discover series through posts when community is disabled", async () => {
    vi.stubEnv("FEATURE_COMMUNITY", "false");
    const result = await searchPublicContent("Akari", "en");
    expect(result.posts).toEqual([]);
    expect(mocks.posts).not.toHaveBeenCalled();
    expect(mocks.characters).toHaveBeenCalledTimes(1);
    expect(mocks.series.mock.calls[0][0].where.AND[0].OR).toEqual([{ characters: { some: { publishStatus: "PUBLISHED" } } }]);
  });
  it("normalizes and bounds user input and does not query empty searches", async () => {
    expect(normalizeSearchQuery(["  quiet\n  room ", "ignored"])).toBe("quiet room");
    expect(normalizeSearchQuery("a".repeat(200))).toHaveLength(120);
    expect(await searchPublicContent("   ", "en")).toEqual({ query: "", characters: [], posts: [], series: [] });
    expect(mocks.posts).not.toHaveBeenCalled();
  });
  it("only queries published characters/posts, excludes future or suspended posts and private creator series", async () => {
    await searchPublicContent("Akari", "zh-Hant");
    expect(mocks.characters.mock.calls[0][0].where.publishStatus).toBe("PUBLISHED");
    expect(mocks.characters.mock.calls[0][0].select.locales.where.locale).toBe("ZH_HANT");
    const post = mocks.posts.mock.calls[0][0];
    expect(post.where.AND[0]).toMatchObject({ status: "PUBLISHED", publishedAt: { lte: expect.any(Date) }, author: { creatorProfile: { isNot: { status: "SUSPENDED" } } }, OR: [{ creatorSeriesId: null }, { creatorSeries: { published: true } }] });
    expect(post.select).toEqual({ id: true, slug: true, title: true, body: true });
    const series = mocks.series.mock.calls[0][0];
    expect(series.where.AND[0].OR[0]).toEqual({ characters: { some: { publishStatus: "PUBLISHED" } } });
    expect(series.where.AND[0].OR[1].posts.some.status).toBe("PUBLISHED");
    expect(series.select).not.toHaveProperty("libraryEntries");
    expect(series.select).not.toHaveProperty("ratings");
    expect([mocks.characters, mocks.posts, mocks.series].every((mock) => mock.mock.calls[0][0].take === 12)).toBe(true);
  });
  it("returns localized catalog copy, preserves user-authored post language, and emits minimal DTOs", async () => {
    mocks.characters.mockResolvedValue([{ id: "c", slug: "akari", name: "Akari", summary: "English", locales: [{ name: "明里", summary: "中文簡介" }], privateField: "secret" }]);
    mocks.posts.mockResolvedValue([{ id: "p", slug: "note", title: "An English fan note", body: "A long\nfan note", authorEmail: "private@example.com" }]);
    mocks.series.mockResolvedValue([{ id: "s", slug: "signal", title: "Signal", summary: "English", locales: [{ title: "訊號", summary: "作品簡介" }], libraryEntries: [{ private: true }] }]);
    const result = await searchPublicContent("signal", "zh-Hant");
    expect(result.characters[0]).toEqual({ id: "c", slug: "akari", title: "明里", summary: "中文簡介" });
    expect(result.posts[0].title).toBe("An English fan note");
    expect(result.series[0].title).toBe("訊號");
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("private@example.com");
    expect(JSON.stringify(result)).not.toContain("libraryEntries");
  });
});
