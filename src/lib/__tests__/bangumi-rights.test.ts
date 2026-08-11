import { describe, expect, it } from "vitest";
import { validateBangumiAttribution } from "@/lib/content-policy";

describe("bangumi import safeguards", () => {
  it("rejects imported text that lacks attribution metadata", () => {
    expect(() =>
      validateBangumiAttribution({
        sourceUrl: "https://bgm.tv/dev",
        importedText: "Unsafe text body",
      }),
    ).toThrow("Imported Bangumi text requires source, license, and attribution details.");
  });

  it("accepts metadata-only import when attribution fields are present", () => {
    expect(() =>
      validateBangumiAttribution({
        sourceUrl: "https://bgm.tv/dev",
        importedText: "Imported summary text",
        licenseName: "CC BY-SA",
        attributionText: "Metadata adapted from Bangumi with attribution preserved.",
      }),
    ).not.toThrow();
  });
});
