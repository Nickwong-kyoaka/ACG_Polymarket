import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { getBuyQuote } from "@/lib/market";
import { compactNumber, currencyLabel } from "@/lib/utils";
import { WatchlistButton } from "@/components/watchlist-button";
import type { Character } from "@/lib/types";

export function CharacterCard({
  character,
  watching = false,
  commentCount = 0,
}: {
  character: Character;
  watching?: boolean;
  commentCount?: number;
}) {
  const quote = getBuyQuote(character);

  return (
    <Surface className="overflow-hidden">
      <div
        className="h-40 w-full"
        style={{
          background: `linear-gradient(135deg, ${character.accentFrom}, ${character.accentTo})`,
        }}
      />
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={character.rightsType === "ORIGINAL" ? "warm" : "cool"}>
                {character.rightsType === "ORIGINAL" ? "Original IP" : "Licensed Metadata"}
              </Badge>
              {character.metadataOnly ? <Badge>Attribution First</Badge> : null}
            </div>
            <div>
              <h3 className="font-display text-3xl text-slate-950">{character.name}</h3>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                {character.title}
              </p>
            </div>
          </div>
          <WatchlistButton characterId={character.id} watching={watching} />
        </div>

        <p className="line-clamp-3 text-sm leading-7 text-slate-600">{character.summary}</p>

        <div className="flex flex-wrap gap-2">
          {character.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-[1.5rem] bg-slate-950 px-4 py-3 text-white">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Quote</p>
            <p className="text-lg font-semibold">{currencyLabel(quote)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Supporters</p>
            <p className="text-lg font-semibold">{compactNumber(character.supporterCount)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Comments</p>
            <p className="text-lg font-semibold">{compactNumber(commentCount)}</p>
          </div>
        </div>

        <Link
          href={`/character/${character.slug}`}
          className="inline-flex items-center justify-center rounded-full bg-[#db5d35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c14a24]"
        >
          Open character page
        </Link>
      </div>
    </Surface>
  );
}
