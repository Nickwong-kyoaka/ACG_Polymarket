import { describe, expect, it } from "vitest";
import { normalizeExternalScore, normalizeExternalScores } from "@/lib/external-scores";

describe("external score normalization", () => {
  it("normalizes common 10-point ACG scores onto a 100-point scale", () => {
    expect(
      normalizeExternalScore({
        source: "MyAnimeList",
        score: 8.24,
        scale: 10,
        voteCount: 2500,
      }),
    ).toEqual({
      source: "MyAnimeList",
      normalizedScore: 82.4,
      confidence: "high",
    });
  });

  it("normalizes 5-point scores and tracks lower sample confidence", () => {
    expect(
      normalizeExternalScore({
        source: "Anime-Planet",
        score: 4.1,
        scale: 5,
        voteCount: 320,
      }),
    ).toEqual({
      source: "Anime-Planet",
      normalizedScore: 82,
      confidence: "medium",
    });
  });

  it("sorts normalized sources by score without changing source labels", () => {
    const [top] = normalizeExternalScores([
      { source: "AniList", score: 78, scale: 100, voteCount: 9000 },
      { source: "Bangumi", score: 7.9, scale: 10, voteCount: 90 },
    ]);

    expect(top.source).toBe("Bangumi");
    expect(top.normalizedScore).toBe(79);
  });
});
