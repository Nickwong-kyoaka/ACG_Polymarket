import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/api";
import {
  createPostInputSchema,
  decidePostReview,
  decodeSocialCursor,
  encodeSocialCursor,
  rankFeedCandidates,
  type FeedRankingCandidate,
} from "@/lib/social";

function candidate(
  id: string,
  overrides: Partial<FeedRankingCandidate> = {},
): FeedRankingCandidate {
  return {
    id,
    authorId: `author-${id}`,
    primaryCharacterId: null,
    seriesId: null,
    topicIds: [],
    publishedAt: new Date("2026-09-04T10:00:00.000Z"),
    saveCount: 0,
    reactionCount: 0,
    commentCount: 0,
    seasonal: false,
    hasSource: false,
    ...overrides,
  };
}

describe("social post moderation", () => {
  it("keeps the first three approved submissions in review", () => {
    expect(
      decidePostReview({
        approvedPostCount: 2,
        probationComplete: false,
        hasNewMedia: false,
      }),
    ).toEqual({ status: "PENDING_REVIEW", reason: "CREATOR_PROBATION" });

    expect(
      decidePostReview({
        approvedPostCount: 3,
        probationComplete: false,
        hasNewMedia: false,
      }),
    ).toEqual({ status: "PUBLISHED", reason: null });
  });

  it("always reviews external or newly uploaded media", () => {
    expect(
      decidePostReview({
        approvedPostCount: 50,
        probationComplete: true,
        hasNewMedia: true,
      }),
    ).toEqual({ status: "PENDING_REVIEW", reason: "NEW_MEDIA_REVIEW" });
  });

  it("accepts published-asset references but rejects unsafe external media input", () => {
    const assetPost = createPostInputSchema.parse({
      language: "en",
      title: "A quiet scene",
      body: "A short appreciation note.",
      media: [{ assetId: "asset-published" }],
    });
    expect(assetPost.media[0].assetId).toBe("asset-published");

    expect(() =>
      createPostInputSchema.parse({
        language: "en",
        title: "External art",
        body: "Source details are incomplete.",
        media: [{ publicUrl: "https://cdn.example.test/art.webp", altText: "Fan art" }],
      }),
    ).toThrow(/sourceUrl is required/);

    expect(() =>
      createPostInputSchema.parse({
        language: "en",
        title: "Spoofed identity",
        body: "The route must ignore body identities.",
        userId: "another-user",
      }),
    ).toThrow();
  });
});

describe("social feed ranking", () => {
  const now = new Date("2026-09-04T12:00:00.000Z");

  it("ranks followed interests first and explains the decision in the requested locale", () => {
    const ranked = rankFeedCandidates(
      [
        candidate("popular", { saveCount: 6 }),
        candidate("followed", {
          primaryCharacterId: "character-1",
          topicIds: ["topic-1"],
        }),
      ],
      {
        mode: "for-you",
        locale: "zh-Hant",
        now,
        followedCharacterIds: new Set(["character-1"]),
        followedTopicIds: new Set(["topic-1"]),
      },
    );

    expect(ranked[0].candidate.id).toBe("followed");
    expect(ranked[0].reasons.map((reason) => reason.code)).toContain("FOLLOWED_CHARACTER");
    expect(ranked[0].reasons.map((reason) => reason.label)).toContain("有你關注的角色");
  });

  it("uses deterministic recency and id tie breakers", () => {
    const ranked = rankFeedCandidates(
      [candidate("b"), candidate("a")],
      { mode: "for-you", locale: "en", now },
    );
    expect(ranked.map((entry) => entry.candidate.id)).toEqual(["a", "b"]);
  });

  it("limits an author to two and a series to four slots in a twenty-note window", () => {
    const candidates = Array.from({ length: 40 }, (_, index) => candidate(`p-${index}`, { authorId: index < 10 ? "prolific" : `author-${index}`, seriesId: index < 20 ? "dominant-series" : `series-${index}`, saveCount: 100 - index }));
    const ranked = rankFeedCandidates(candidates, { mode: "for-you", locale: "en", now }).slice(0, 20);
    expect(ranked.filter(({ candidate: entry }) => entry.authorId === "prolific").length).toBeLessThanOrEqual(2);
    expect(ranked.filter(({ candidate: entry }) => entry.seriesId === "dominant-series").length).toBeLessThanOrEqual(4);
    expect(ranked).toHaveLength(20);
  });
});

describe("social cursors", () => {
  it("round-trips an opaque timestamp cursor", () => {
    const at = new Date("2026-09-04T12:34:56.000Z");
    const cursor = encodeSocialCursor(at, "post-1");
    expect(cursor).not.toContain("post-1");
    expect(decodeSocialCursor(cursor)).toEqual({ at, id: "post-1" });
  });

  it("maps malformed cursors to a 422 application error", () => {
    try {
      decodeSocialCursor("not-a-valid-cursor");
      throw new Error("Expected decodeSocialCursor to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(422);
      expect((error as AppError).code).toBe("INVALID_CURSOR");
    }
  });
});
