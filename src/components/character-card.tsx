import Link from "next/link";
import { CharacterArt } from "@/components/character-art";
import { CharacterSourceStatus } from "@/components/character-sections/source-notes";
import { getExchangeCopy, localePath, localizeCharacter, type PublicLocale } from "@/components/acg-locale";
import { getBuyQuote } from "@/lib/market";
import { compactNumber, currencyLabel } from "@/lib/utils";
import { WatchlistButton } from "@/components/watchlist-button";
import type { Character } from "@/lib/types";

export function CharacterCard({ character, watching = false, commentCount = 0, activity24h, campaign, asset, locale = "en" }: {
  character: Character;
  watching?: boolean;
  commentCount?: number;
  activity24h?: { buyUnits: number; uniqueSupporters: number; volume: number };
  campaign?: { title: string; currentUnits: number; goalUnits: number; progressPercent: number } | null;
  asset?: { publicUrl: string; altText: string; sourceLabel?: string | null; sourceKind?: string | null; permissionStatus?: string | null };
  locale?: PublicLocale;
}) {
  const localized = localizeCharacter(character, locale);
  const copy = getExchangeCopy(locale);
  const href = localePath(locale, `/character/${character.slug}`);
  const zh = locale === "zh-Hant";

  return <article className="character-card exchange-panel group overflow-hidden bg-white">
    <div className="flex gap-4 p-4">
      <Link href={href} aria-label={localized.name} className="block w-24 shrink-0 overflow-hidden rounded-xl sm:w-28">
        <CharacterArt character={localized} asset={asset} locale={locale} compact sizes="112px" className="!min-h-0 aspect-[4/5] h-full" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-5 text-slate-500">{localized.sourceTitle ?? localized.title}</p>
        <h3 className="mt-1 font-display text-xl leading-tight"><Link href={href} className="hover:underline">{localized.name}</Link></h3>
        <p className="mt-3 text-xs text-slate-600">{zh ? "每份應援價格" : "Support-unit price"}</p>
        <p className="mt-1 text-lg font-bold text-slate-900">{currencyLabel(getBuyQuote(character))}</p>
        <p className="mt-1 text-xs text-slate-500">{zh ? "虛擬應援份數，非機率" : "Virtual support units, not probability"}</p>
      </div>
    </div>
    <div className="grid gap-3 border-t border-slate-200 p-4">
      {asset ? <CharacterSourceStatus locale={locale} permissionStatus={asset.permissionStatus} sourceKind={asset.sourceKind} /> : <p className="text-xs text-slate-600">{character.rightsType === "ORIGINAL" ? copy.common.original : copy.common.metadata}</p>}
      <p className="text-xs leading-5 text-slate-600">{compactNumber(character.supporterCount)} {copy.common.supporters} · {compactNumber(commentCount)} {copy.common.comments}</p>
      {activity24h ? <p className="text-xs leading-5 text-slate-600">{zh ? "24 小時應援" : "24h support"}: +{activity24h.buyUnits} · {activity24h.uniqueSupporters} {zh ? "人" : "fans"}</p> : null}
      {campaign ? <p className="text-xs leading-5 text-slate-600">{campaign.title} · {Math.round(campaign.progressPercent)}% {zh ? "里程碑進度" : "milestone progress"}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 [&_button]:min-h-11 [&_button]:text-sm">
        <Link href={href} className="exchange-button-secondary min-h-11 text-sm">{copy.common.open}</Link>
        <WatchlistButton characterId={character.id} watching={watching} locale={locale} />
      </div>
    </div>
  </article>;
}
