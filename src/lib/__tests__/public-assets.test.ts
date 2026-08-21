import { describe, expect, it } from "vitest";
import type { CharacterAsset } from "@/lib/types";
import { publishedVisuals } from "@/lib/public-assets";

function visual(id: string, kind: CharacterAsset["kind"], primaryPriority: number): CharacterAsset {
  return {
    id,
    kind,
    primaryPriority,
    label: id,
    storageKey: `assets/${id}.webp`,
    altText: id,
    workflowStatus: "PUBLISHED",
    version: 1,
  };
}

describe("published character visuals", () => {
  it("keeps hero images first and orders outfit variants by editorial priority", () => {
    const result = publishedVisuals([
      visual("card", "CARD", 500),
      visual("outfit-two", "HERO", 298),
      visual("primary", "HERO", 300),
      visual("outfit-one", "HERO", 299),
    ]);

    expect(result.map((asset) => asset.id)).toEqual(["primary", "outfit-one", "outfit-two", "card"]);
  });

  it("hides draft visuals from public galleries", () => {
    const draft = { ...visual("draft", "HERO", 999), workflowStatus: "REVIEWED" as const };
    expect(publishedVisuals([draft])).toEqual([]);
  });
});
