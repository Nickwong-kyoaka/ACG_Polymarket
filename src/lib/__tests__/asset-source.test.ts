import { describe, expect, it } from "vitest";
import { validateAssetSource } from "@/lib/asset-source";

describe("asset source validation", () => {
  it("allows AI-generated cosmetics when provenance is attached", () => {
    expect(
      validateAssetSource({
        sourceType: "AI_GENERATED",
        workflowStatus: "PUBLISHED",
        sourceLabel: "Internal generated wallpaper batch",
        aiPrompt: "soft cafe date wallpaper with original mascot",
      }),
    ).toMatchObject({
      ok: true,
      publishable: true,
      errors: [],
    });
  });

  it("rejects Bangumi metadata without license and attribution markers", () => {
    const result = validateAssetSource({
      sourceType: "BANGUMI_METADATA",
      workflowStatus: "PUBLISHED",
      sourceLabel: "Bangumi",
      sourceUrl: "https://bangumi.tv/subject/49131",
    });

    expect(result.ok).toBe(false);
    expect(result.publishable).toBe(false);
    expect(result.errors).toContain("Bangumi metadata requires license and attribution text.");
  });

  it("keeps official reference assets unpublished until a rights grant exists", () => {
    const result = validateAssetSource({
      sourceType: "OFFICIAL_REFERENCE",
      workflowStatus: "PUBLISHED",
      sourceLabel: "Official reference art",
      sourceUrl: "https://example.com/reference",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Official reference assets cannot be published without a rights grant.");
  });
});
