import Link from "next/link";
import { ExternalLink, ImageIcon, ShieldCheck } from "lucide-react";
import { CharacterArt } from "@/components/character-art";
import { localePath, type PublicLocale } from "@/components/acg-locale";
import type { Character } from "@/lib/types";
import type { PublicCharacterAsset } from "@/lib/public-assets";

export function AssetSourceCard({ character, asset, locale }: { character: Character; asset?: PublicCharacterAsset; locale: PublicLocale }) {
  const source = asset?.sourceLabel ?? asset?.sourceKind?.replaceAll("_", " ") ?? (character.rightsType === "ORIGINAL" ? "ACG Exchange Original" : "Signal fallback");
  const permission = asset?.permissionBadge ?? (character.rightsType === "ORIGINAL" ? "ORIGINAL / AI" : "NO IMAGE PUBLISHED");
  return (
    <article className="character-card exchange-panel group overflow-hidden">
      <Link href={localePath(locale, `/gallery/${character.slug}`)} className="relative block">
        <CharacterArt character={character} asset={asset} />
        <div className="absolute inset-x-0 bottom-0 z-10 p-5 text-white">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-white/60">{character.sourceTitle}</p>
          <h2 className="mt-2 font-display text-4xl leading-none">{character.name}</h2>
        </div>
      </Link>
      <div className="grid gap-4 p-5">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#eef8f7] px-3 py-1 text-[9px] font-black uppercase tracking-[.13em] text-[#19757a]"><ShieldCheck className="h-3 w-3" />{permission}</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f5f1e8] px-3 py-1 text-[9px] font-black uppercase tracking-[.13em] text-slate-500"><ImageIcon className="h-3 w-3" />{source}</span>
        </div>
        {asset?.sourceUrl?.startsWith("https://") ? <a href={asset.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-black text-[#e83c62] hover:underline">{locale === "zh-Hant" ? "開啟原始來源" : "Open original source"}<ExternalLink className="h-3.5 w-3.5" /></a> : null}
      </div>
    </article>
  );
}
