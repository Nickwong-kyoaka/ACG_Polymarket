import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { getCopy, hrefWithLocale, type Locale } from "@/lib/i18n";
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
  locale?: Locale;
}) {
  const quote = getBuyQuote(character);
  const copy = getCopy(locale);

  return (
    <Surface className="group overflow-hidden transition duration-300 hover:-translate-y-1">
      <div
        className="anime-portrait-stage shine-sweep min-h-[230px] w-full"
        style={{
          background: `linear-gradient(135deg, ${character.accentFrom}, ${character.accentTo})`,
        }}
      >
        <div className="halftone absolute inset-0 opacity-30" />
        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          <Badge tone={character.rightsType === "ORIGINAL" ? "warm" : "cool"}>
            {character.rightsType === "ORIGINAL" ? copy.common.originalIp : copy.common.licensedMetadata}
          </Badge>
          {character.metadataOnly ? <Badge>{copy.common.attributionFirst}</Badge> : null}
        </div>
        <div className="absolute bottom-5 left-5 right-5 rounded-[1.5rem] bg-white/88 p-4 backdrop-blur">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ff3d7f]">
            {character.sourceTitle ?? character.title}
          </p>
          <h3 className="mt-1 font-display text-3xl leading-none text-[#171126]">
            {character.name}
          </h3>
        </div>
      </div>
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                {character.title}
              </p>
              {character.favoritePhrase ? (
                <p className="mt-3 rounded-[1.25rem] bg-[#fff2c5] px-4 py-3 text-sm leading-7 text-[#171126]">
                  &ldquo;{character.favoritePhrase}&rdquo;
                </p>
              ) : null}
            </div>
          </div>
          <WatchlistButton characterId={character.id} watching={watching} />
        </div>

        <p className="line-clamp-3 text-sm leading-7 text-slate-600">{character.summary}</p>

        <div className="flex flex-wrap gap-2">
          {character.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/75 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-600 ring-1 ring-black/10"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-[1.5rem] bg-[#171126] px-4 py-3 text-white">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
              {copy.common.quote}
            </p>
            <p className="text-lg font-semibold">{currencyLabel(quote)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
              {copy.common.supporters}
            </p>
            <p className="text-lg font-semibold">{compactNumber(character.supporterCount)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
              {copy.common.comments}
            </p>
            <p className="text-lg font-semibold">{compactNumber(commentCount)}</p>
          </div>
        </div>

        <Link
          href={hrefWithLocale(`/character/${character.slug}`, locale)}
          className="inline-flex items-center justify-center rounded-full bg-[#ff3d7f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#e32369]"
        >
          {copy.common.openCharacter}
        </Link>
      </div>
    </Surface>
  );
}
