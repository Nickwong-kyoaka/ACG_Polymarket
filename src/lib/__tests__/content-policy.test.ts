import { describe, expect, it } from "vitest";
import { normalizeExternalScore, validateAssetSource } from "@/lib/content-policy";

describe("asset/source validation", () => {
  it("blocks published assets without a rights grant", () => {
    expect(() =>
      validateAssetSource({
        workflowStatus: "PUBLISHED",
        sourceKind: "AI_GENERATED",
      }),
    ).toThrow("Published assets require a linked rights grant.");
  });

  it("requires attribution for Bangumi metadata assets", () => {
    expect(() =>
      validateAssetSource({
        workflowStatus: "REVIEWED",
        sourceKind: "BANGUMI_METADATA",
      }),
    ).toThrow("Bangumi metadata assets require source URL and attribution text.");
  });
});

describe("external score normalization", () => {
  it("clamps source scores to a 0-100 display scale", () => {
    expect(normalizeExternalScore({ source: "AniList", score: 112 }).score).toBe(100);
    expect(normalizeExternalScore({ source: "Bangumi", score: -3 }).score).toBe(0);
  });
});
