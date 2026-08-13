import { describe, expect, it } from "vitest";
import { getCopy, hrefWithLocale, localeCopy, normalizeLocale } from "@/lib/i18n";

describe("localization helpers", () => {
  it("normalizes supported locale values and safely falls back to English", () => {
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("cn")).toBe("cn");
    expect(normalizeLocale("unknown")).toBe("en");
    expect(normalizeLocale()).toBe("en");
  });

  it("replaces the locale query while preserving other query parameters", () => {
    expect(hrefWithLocale("/market?tag=idol&lang=en", "cn")).toBe(
      "/market?tag=idol&lang=cn",
    );
  });

  it("keeps the English and Chinese dictionaries structurally aligned", () => {
    expect(Object.keys(localeCopy.cn)).toEqual(Object.keys(localeCopy.en));
    expect(getCopy("en")).toBe(localeCopy.en);
    expect(getCopy("cn")).toBe(localeCopy.cn);
  });
});
