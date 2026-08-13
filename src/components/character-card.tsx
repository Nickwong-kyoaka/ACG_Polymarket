import Link from "next/link";
import { MessageCircle, Radio, Users } from "lucide-react";
import { CharacterArt } from "@/components/character-art";
import { getExchangeCopy, localePath, localizeCharacter, type PublicLocale } from "@/components/acg-locale";
import { MarketSparkline } from "@/components/market-sparkline";
import { Badge } from "@/components/ui/badge";
import { getBuyQuote } from "@/lib/market";
import { compactNumber, currencyLabel } from "@/lib/utils";
import { WatchlistButton } from "@/components/watchlist-button";
import type { Character } from "@/lib/types";

export function CharacterCard({
  character,
  watching = false,
  commentCount = 0,
  locale = "en",
}: {
  character: Character;
  watching?: boolean;
  commentCount?: number;
  locale?: PublicLocale;
}) {
  const localized = localizeCharacter(character, locale);
  const quote = getBuyQuote(character);
  const copy = getExchangeCopy(locale);

  return (
    <article className="character-card exchange-panel group overflow-hidden">
      <div className="relative">
        <CharacterArt character={localized} priority={character.isFeatured} />
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 sm:left-5 sm:top-5">
          <Badge tone={character.rightsType === "ORIGINAL" ? "warm" : "cool"}>
            {character.rightsType === "ORIGINAL" ? copy.common.original : copy.common.metadata}
          </Badge>
          {character.releaseSeason ? <Badge>{character.releaseSeason}</Badge> : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 p-5 text-white sm:p-6">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/65">
            {localized.sourceTitle ?? localized.title}
          </p>
          <h3 className="font-display text-4xl leading-none sm:text-[2.8rem]">
            {localized.name}
          </h3>
        </div>
      </div>
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e83c62]">{localized.title}</p>
            {localized.favoritePhrase ? <p className="mt-3 text-sm leading-7 text-slate-600">&ldquo;{localized.favoritePhrase}&rdquo;</p> : null}
          </div>
          <WatchlistButton characterId={character.id} watching={watching} locale={locale} />
        </div>

        <p className="line-clamp-3 text-sm leading-7 text-slate-600">{localized.summary}</p>

        <div className="flex flex-wrap gap-2">
          {character.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#eef1f3] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">#{tag}</span>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_112px] items-end gap-4 rounded-[20px_5px_20px_5px] bg-[#111827] p-4 text-white">
          <div className="grid grid-cols-3 gap-3">
            <div className="market-stat">
              <Radio className="mb-2 h-4 w-4 text-[#ffcc66]" />
              <p className="text-[9px] uppercase tracking-[0.15em] text-white/45">{copy.common.quote}</p>
              <p className="mt-1 text-base font-black">{currencyLabel(quote)}</p>
            </div>
            <div className="market-stat">
              <Users className="mb-2 h-4 w-4 text-[#3ed6e0]" />
              <p className="text-[9px] uppercase tracking-[0.15em] text-white/45">{copy.common.supporters}</p>
              <p className="mt-1 text-base font-black">{compactNumber(character.supporterCount)}</p>
            </div>
            <div className="market-stat">
              <MessageCircle className="mb-2 h-4 w-4 text-[#ff7d9a]" />
              <p className="text-[9px] uppercase tracking-[0.15em] text-white/45">{copy.common.comments}</p>
              <p className="mt-1 text-base font-black">{compactNumber(commentCount)}</p>
            </div>
          </div>
          <MarketSparkline seed={character.circulatingUnits + character.supporterCount} />
        </div>

        <Link
          href={localePath(locale, `/character/${character.slug}`)}
          className="exchange-button-primary"
        >
          {copy.common.open}
        </Link>
      </div>
    </article>
  );
}
