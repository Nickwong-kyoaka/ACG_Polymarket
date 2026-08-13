import Image from "next/image";
import type { CSSProperties } from "react";
import { getSafeCharacterImage } from "@/lib/character-visuals";
import { cn } from "@/lib/utils";
import type { Character } from "@/lib/types";

export function CharacterArt({
  character,
  className,
  priority = false,
  sizes = "(min-width: 1024px) 48vw, 100vw",
}: {
  character: Character;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const imageUrl = getSafeCharacterImage(character);
  const posterStyle = {
    "--signal-from": character.accentFrom,
    "--signal-to": character.accentTo,
  } as CSSProperties;

  return (
    <div
      className={cn("character-art relative isolate overflow-hidden", imageUrl ? "has-key-art" : "signal-poster", className)}
      style={posterStyle}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={`${character.name} original character key visual`}
          fill
          sizes={sizes}
          className="object-cover object-top transition duration-700 group-hover:scale-[1.025]"
          priority={priority}
        />
      ) : (
        <>
          <div className="signal-orbit signal-orbit-one" />
          <div className="signal-orbit signal-orbit-two" />
          <div className="signal-silhouette" />
          <span className="signal-index">{String(character.supporterCount).padStart(3, "0")}</span>
          <span className="signal-glyph">{character.name.trim().charAt(0).toUpperCase()}</span>
          <span className="signal-label">METADATA / SUPPORT SIGNAL</span>
        </>
      )}
      <div className="character-art-vignette" />
    </div>
  );
}
