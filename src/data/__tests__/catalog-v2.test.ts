import { describe, expect, it } from "vitest";
import { catalogCharactersV2, catalogSeriesV2, validateCatalogV2 } from "@/data/catalog-v2";

describe("ACG Support Exchange+ V2 catalog", () => {
  it("contains exactly the requested 24 unique bilingual characters", () => {
    expect(validateCatalogV2()).toEqual([]);
    expect(catalogCharactersV2).toHaveLength(24);
    expect(new Set(catalogCharactersV2.map((entry) => entry.slug))).toHaveLength(24);

    for (const entry of catalogCharactersV2) {
      expect(entry.name.en.length).toBeGreaterThan(0);
      expect(entry.name["zh-Hant"].length).toBeGreaterThan(0);
      expect(entry.summary.en.length).toBeGreaterThan(30);
      expect(entry.summary["zh-Hant"].length).toBeGreaterThan(10);
      expect(entry.tags.en.length).toBeGreaterThan(0);
      expect(entry.tags["zh-Hant"].length).toBeGreaterThan(0);
    }
  });

  it("matches the requested group counts and authoritative-source policy", () => {
    const originalSeries = new Set(catalogSeriesV2.filter((entry) => entry.rightsType === "ORIGINAL").map((entry) => entry.slug));
    const originals = catalogCharactersV2.filter((entry) => originalSeries.has(entry.seriesSlug));
    const licensed = catalogCharactersV2.filter((entry) => !originalSeries.has(entry.seriesSlug));

    expect(originals.map((entry) => entry.slug)).toEqual(["akari-hoshino", "ren-tsukishiro", "mira-kagetsu"]);
    expect(licensed).toHaveLength(21);
    expect(licensed.every((entry) => entry.authoritativeSource.url?.startsWith("https://"))).toBe(true);
    expect(licensed.every((entry) => entry.authoritativeSource.kind.startsWith("OFFICIAL_"))).toBe(true);
  });

  it("reports duplicates and missing catalog entries", () => {
    expect(validateCatalogV2(catalogCharactersV2.slice(0, 23))).toContain("Catalog must contain exactly 24 characters; received 23.");
    expect(validateCatalogV2([...catalogCharactersV2.slice(0, 23), catalogCharactersV2[0]])).toContain(
      "Duplicate character slug: akari-hoshino.",
    );
  });
});
