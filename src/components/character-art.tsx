import Image from "next/image";
import type { CSSProperties } from "react";
import { getSafeCharacterImage } from "@/lib/character-visuals";
import type { PublicCharacterAsset } from "@/lib/public-assets";
import { cn } from "@/lib/utils";
import type { Character } from "@/lib/types";

export function CharacterArt({
  character,
  className,
  priority = false,
  sizes = "(min-width: 1024px) 48vw, 100vw",
  asset,
}: {
  character: Character;
  className?: string;
  priority?: boolean;
  sizes?: string;
  asset?: Pick<PublicCharacterAsset, "publicUrl" | "altText">;
}) {
  const imageUrl = asset?.publicUrl ?? getSafeCharacterImage(character);
  const posterStyle = {
    "--signal-from": character.accentFrom,
    "--signal-to": character.accentTo,
  } as CSSProperties;

  return (
    <div
      className={cn("character-art relative isolate overflow-hidden", imageUrl ? "has-key-art" : "signal-poster", className)}
      style={posterStyle}
    >
      {imageUrl?.startsWith("/") ? (
        <Image
          src={imageUrl}
          alt={asset?.altText ?? `${character.name} original character key visual`}
          fill
          sizes={sizes}
          className="object-cover object-top transition duration-700 group-hover:scale-[1.025]"
          priority={priority}
        />
      ) : imageUrl ? (
        <div
          role="img"
          aria-label={asset?.altText ?? `${character.name} character visual`}
          className="absolute inset-0 bg-cover bg-top transition duration-700 group-hover:scale-[1.025]"
          style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
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
