"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { getSafeCharacterImage } from "@/lib/character-visuals";
import { safePublicMediaUrl, type PublicCharacterAsset } from "@/lib/public-assets";
import { cn } from "@/lib/utils";
import type { Character } from "@/lib/types";

export function CharacterArt({
  character,
  className,
  priority = false,
  sizes = "(min-width: 1024px) 48vw, 100vw",
  asset,
  locale = "en",
  compact = false,
}: {
  character: Character;
  className?: string;
  priority?: boolean;
  sizes?: string;
  asset?: Pick<PublicCharacterAsset, "publicUrl" | "altText">;
  locale?: "en" | "zh-Hant";
  compact?: boolean;
}) {
  const imageUrl = safePublicMediaUrl(asset?.publicUrl ?? getSafeCharacterImage(character));
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(imageUrl && failedUrl !== imageUrl);
  const alt = asset?.altText?.trim() || `${character.name} · ${character.sourceTitle ?? character.title}`;
  const fallback = locale === "zh-Hant" ? (imageUrl ? "圖片暫時無法載入" : "尚無可展示的角色圖片") : (imageUrl ? "Image temporarily unavailable" : "No character image available");
  const posterStyle = {
    "--signal-from": character.accentFrom,
    "--signal-to": character.accentTo,
  } as CSSProperties;

  return (
    <div
      className={cn("character-art relative isolate aspect-[4/5] overflow-hidden", showImage ? "has-key-art" : "signal-poster", className)}
      style={posterStyle}
    >
      {showImage && imageUrl?.startsWith("/") ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover object-top transition duration-700 motion-safe:group-hover:scale-[1.025] motion-reduce:transition-none"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : showImage && imageUrl ? (
        // Remote sources stay direct: no new proxy, download, or rights assumption.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={alt}
          width={800}
          height={1000}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(imageUrl)}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <div role="img" aria-label={`${character.name}: ${fallback}`} className={cn("absolute inset-0 grid place-content-center bg-slate-100 text-center text-slate-600", compact ? "gap-2 p-2" : "gap-3 p-5")}>
          <span aria-hidden="true" className={cn("font-display", compact ? "text-2xl" : "text-5xl")}>{character.name.trim().charAt(0).toUpperCase()}</span>
          <span className="text-xs leading-5">{fallback}</span>
          {!compact ? <span className="text-xs leading-5">{character.sourceTitle ?? character.title}</span> : null}
        </div>
      )}
    </div>
  );
}
