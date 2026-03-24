import { beforeEach, describe, expect, it } from "vitest";
import { importBangumiCharacter, resetDemoStore } from "@/lib/store";

describe("bangumi import safeguards", () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it("rejects imported text that lacks attribution metadata", () => {
    expect(() =>
      importBangumiCharacter({
        seriesTitle: "Unsafe Import",
        characterName: "Missing Credit",
        slug: "missing-credit",
        summary: "This should fail because imported text has no license metadata.",
        fandomPrompt: "Do not publish this without attribution.",
        tags: ["metadata"],
        sourceUrl: "https://bgm.tv/dev",
        sourceLabel: "Bangumi Archive",
        importedText: "Unsafe text body",
      }),
    ).toThrow("Imported Bangumi text requires license and attribution details.");
  });

  it("accepts metadata-only import when attribution fields are present", () => {
    const result = importBangumiCharacter({
      seriesTitle: "Safe Import",
      characterName: "Attribution Hero",
      slug: "attribution-hero",
      summary: "A metadata-only import that keeps its provenance attached.",
      fandomPrompt: "Support this only as a rights-aware metadata showcase.",
      tags: ["metadata", "safe"],
      sourceUrl: "https://bgm.tv/dev",
      sourceLabel: "Bangumi Archive",
      importedText: "Imported summary text",
      licenseName: "CC BY-SA",
      attributionText: "Metadata adapted from Bangumi with attribution preserved.",
      originalAuthor: "Bangumi contributors",
    });

    expect(result.character.metadataOnly).toBe(true);
    expect(result.attribution.licenseName).toBe("CC BY-SA");
  });
});
