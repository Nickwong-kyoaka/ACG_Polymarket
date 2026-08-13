import { describe, expect, it } from "vitest";
import rawManifest from "../../../content/media-sources.json";
import { catalogCharactersV2 } from "@/data/catalog-v2";
import {
  parseMediaManifest,
  validateMediaManifest,
  validatePublicHttpsUrl,
  type MediaSourceManifest,
} from "@/lib/media-manifest";

describe("catalog media source manifest", () => {
  const manifest = parseMediaManifest(rawManifest);
  const expectedSlugs = catalogCharactersV2.map((entry) => entry.slug);

  it("has one valid source record for every catalog character", () => {
    const result = validateMediaManifest(manifest, { expectedCharacterSlugs: expectedSlugs });
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(manifest.entries).toHaveLength(24);
    expect(new Set(manifest.entries.map((entry) => entry.characterSlug))).toHaveLength(24);
  });

  it("does not embed or approve unlicensed third-party image bytes", () => {
    const licensedEntries = manifest.entries.filter((entry) => entry.sourceKind === "OFFICIAL_REFERENCE");
    expect(licensedEntries).toHaveLength(21);
    expect(licensedEntries.every((entry) => entry.directMediaUrl === null)).toBe(true);
    expect(licensedEntries.every((entry) => entry.localAssetPath === null)).toBe(true);
    expect(licensedEntries.every((entry) => entry.permissionStatus === "UNVERIFIED")).toBe(true);
    expect(licensedEntries.every((entry) => !entry.publicationEligible && !entry.adEligible)).toBe(true);
    expect(licensedEntries.every((entry) => entry.originalPage?.startsWith("https://"))).toBe(true);
  });

  it("records the three pre-existing local originals without claiming missing AI provenance", () => {
    const originals = manifest.entries.filter((entry) => entry.sourceKind === "AI_GENERATED");
    expect(originals).toHaveLength(3);
    expect(originals.every((entry) => entry.localAssetPath?.startsWith("/assets/characters/"))).toBe(true);
    expect(originals.every((entry) => entry.aiProvenance === null && entry.permissionStatus === "UNVERIFIED")).toBe(true);
    expect(originals.every((entry) => Boolean(entry.unresolvedReason))).toBe(true);
  });

  it("rejects private, credentialed, and insecure URLs", () => {
    expect(validatePublicHttpsUrl("http://example.com/image.png")).toBe("must use HTTPS");
    expect(validatePublicHttpsUrl("https://user:secret@example.com/image.png")).toBe("must not contain embedded credentials");
    expect(validatePublicHttpsUrl("https://127.0.0.1/image.png")).toBe("must not target a private or reserved host");
    expect(validatePublicHttpsUrl("https://fcdn.example.com/image.png")).toBeNull();
  });

  it("prevents advertising on unresolved or unverified media", () => {
    const unsafe = structuredClone(manifest) as MediaSourceManifest;
    unsafe.entries[3].adEligible = true;
    const result = validateMediaManifest(unsafe, { expectedCharacterSlugs: expectedSlugs });
    expect(result.errors).toContain(
      "media-yatogami-tohka-official-page cannot be ad eligible while permission is UNVERIFIED.",
    );
    expect(result.errors).toContain(
      "media-yatogami-tohka-official-page cannot be eligible while unresolvedReason is present.",
    );
  });
});
