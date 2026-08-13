import type { Character } from "@/lib/types";

const safeOriginalCharacterImages: Record<string, string> = {
  "akari-hoshino": "/assets/characters/akari-hoshino-hero.png",
  "ren-tsukishiro": "/assets/characters/ren-tsukishiro-hero.png",
  "mira-kagetsu": "/assets/characters/mira-kagetsu-hero.png",
};

export function getSafeCharacterImage(character: Character) {
  if (character.rightsType !== "ORIGINAL" || character.metadataOnly) {
    return undefined;
  }

  return safeOriginalCharacterImages[character.slug];
}
