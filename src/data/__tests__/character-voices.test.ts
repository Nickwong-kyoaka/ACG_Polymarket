import { describe, expect, it } from "vitest";
import { catalogCharactersV2 } from "@/data/catalog-v2";
import { characterVoiceSlugs, getCharacterVoiceProfile } from "@/data/character-voices";

describe("character comfort voices", () => {
  it("gives every catalog character an independent bilingual profile", () => {
    const catalogSlugs = catalogCharactersV2.map((character) => character.slug).sort();
    expect(characterVoiceSlugs.sort()).toEqual(catalogSlugs);

    for (const slug of catalogSlugs) {
      const profile = getCharacterVoiceProfile(slug);
      expect(profile.line.en.length).toBeGreaterThan(40);
      expect(profile.line["zh-Hant"].length).toBeGreaterThan(18);
      expect(profile.style.en).toBeTruthy();
      expect(profile.style["zh-Hant"]).toBeTruthy();
    }
  });

  it("keeps browser synthesis settings inside comfortable ranges", () => {
    for (const slug of characterVoiceSlugs) {
      const profile = getCharacterVoiceProfile(slug);
      expect(profile.rate).toBeGreaterThanOrEqual(0.7);
      expect(profile.rate).toBeLessThanOrEqual(1);
      expect(profile.pitch).toBeGreaterThanOrEqual(0.8);
      expect(profile.pitch).toBeLessThanOrEqual(1.2);
      expect(profile.ambience.every((frequency) => frequency >= 120 && frequency <= 360)).toBe(true);
    }
  });
});
