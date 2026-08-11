import { CharacterCard } from "@/components/character-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCopy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";
import { getCommentCount, getWatchlistIds, listCharacters } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = await getRequestLocale();
  const copy = getCopy(locale);
  const search = typeof params.search === "string" ? params.search : undefined;
  const tag = typeof params.tag === "string" ? params.tag : undefined;
  const rightsType = typeof params.rightsType === "string" ? params.rightsType : undefined;
  const [characters, watchlistIds] = await Promise.all([
    listCharacters({ search, tag, rightsType }),
    getWatchlistIds(),
  ]);
  const cards = await Promise.all(
    characters.map(async (character) => ({
      character,
      commentCount: await getCommentCount(character.id),
    })),
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-12">
      <SectionHeading
        eyebrow={copy.market.eyebrow}
        title={copy.market.title}
        description={copy.market.description}
      />

      <form className="manga-panel hero-grid grid gap-4 rounded-[2rem] bg-white/88 p-6 md:grid-cols-4">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder={copy.market.searchPlaceholder}
          className="rounded-2xl border border-black/10 bg-[#fff8ed] px-4 py-3 outline-none ring-[#ff3d7f] transition focus:ring-2 md:col-span-2"
        />
        <input
          type="text"
          name="tag"
          defaultValue={tag}
          placeholder={copy.market.tagPlaceholder}
          className="rounded-2xl border border-black/10 bg-[#fff8ed] px-4 py-3 outline-none ring-[#ff3d7f] transition focus:ring-2"
        />
        <select
          name="rightsType"
          defaultValue={rightsType ?? ""}
          className="rounded-2xl border border-black/10 bg-[#fff8ed] px-4 py-3 outline-none ring-[#ff3d7f] transition focus:ring-2"
        >
          <option value="">{copy.market.allRights}</option>
          <option value="ORIGINAL">{copy.market.original}</option>
          <option value="LICENSED">{copy.market.licensed}</option>
        </select>
        <input type="hidden" name="lang" value={locale} />
        <button
          type="submit"
          className="rounded-full bg-[#171126] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ff3d7f] md:col-span-4 md:justify-self-start"
        >
          {copy.market.apply}
        </button>
      </form>

      {cards.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {cards.map(({ character, commentCount }) => (
            <CharacterCard
              key={character.id}
              character={character}
              watching={watchlistIds.includes(character.id)}
              commentCount={commentCount}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-[#171126]/20 bg-white/75 p-8 text-slate-600">
          {copy.market.empty}
        </div>
      )}
    </div>
  );
}
