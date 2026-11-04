import { describe, expect, it } from "vitest";
import type { CharacterAsset } from "@/lib/types";
import { publishedVisuals, renderPublicPostMedia, safePublicMediaUrl } from "@/lib/public-assets";

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

  it("hides revoked permission or non-SFW assets even before workflow changes", () => {
    expect(publishedVisuals([
      { ...visual("takedown", "HERO", 1), permissionStatus: "TAKEDOWN_REQUESTED" },
      { ...visual("rejected", "HERO", 1), permissionStatus: "REJECTED" },
      { ...visual("unsafe", "HERO", 1), contentRating: "NSFW" },
    ])).toEqual([]);
  });

  it("never falls back to a copied URL when a linked asset is pulled or missing", () => {
    const media = { status: "APPROVED", assetId: "asset", publicUrl: "https://cdn.example.org/stale.webp", storageKey: "assets/stale.webp", asset: { publicUrl: "https://cdn.example.org/asset.webp", storageKey: "asset.webp", workflowStatus: "PULLED", contentRating: "SFW", permissionStatus: "VERIFIED" } };
    expect(renderPublicPostMedia(media)).toBeNull();
    expect(renderPublicPostMedia({ ...media, asset: null })).toBeNull();
    expect(renderPublicPostMedia({ ...media, asset: { ...media.asset, workflowStatus: "PUBLISHED", permissionStatus: "TAKEDOWN_REQUESTED" } })).toBeNull();
  });

  it("only renders approved media and rejects unsafe local URL fallbacks", () => {
    expect(renderPublicPostMedia({ status: "PENDING_REVIEW", assetId: null, publicUrl: "https://app.example.org/private", storageKey: null })).toBeNull();
    expect(safePublicMediaUrl("//evil.example.org/x")).toBeNull();
    expect(safePublicMediaUrl("/assets/../secret")).toBeNull();
    expect(safePublicMediaUrl("https://user:password@example.org/a")).toBeNull();
    expect(safePublicMediaUrl("javascript:alert(1)")).toBeNull();
  });
});
