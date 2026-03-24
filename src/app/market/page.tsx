import { CharacterCard } from "@/components/character-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCommentCount, getWatchlistIds, listCharacters } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  const tag = typeof params.tag === "string" ? params.tag : undefined;
  const rightsType = typeof params.rightsType === "string" ? params.rightsType : undefined;
  const characters = listCharacters({ search, tag, rightsType });
  const watchlistIds = getWatchlistIds();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12">
      <SectionHeading
        eyebrow="Market"
        title="Support board"
        description="Filter by tag or rights type, then move into a character page to buy or sell back support units. Rankings are organized by support momentum, never by head-to-head conflict."
      />

      <form className="grid gap-4 rounded-[2rem] border border-black/10 bg-white/90 p-6 md:grid-cols-4">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search by name, title, or tag"
          className="rounded-2xl border border-black/10 bg-[#fff9f2] px-4 py-3 outline-none ring-[#db5d35] transition focus:ring-2 md:col-span-2"
        />
        <input
          type="text"
          name="tag"
          defaultValue={tag}
          placeholder="Tag e.g. idol"
          className="rounded-2xl border border-black/10 bg-[#fff9f2] px-4 py-3 outline-none ring-[#db5d35] transition focus:ring-2"
        />
        <select
          name="rightsType"
          defaultValue={rightsType ?? ""}
          className="rounded-2xl border border-black/10 bg-[#fff9f2] px-4 py-3 outline-none ring-[#db5d35] transition focus:ring-2"
        >
          <option value="">All rights types</option>
          <option value="ORIGINAL">Original</option>
          <option value="LICENSED">Licensed metadata</option>
        </select>
        <button
          type="submit"
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 md:col-span-4 md:justify-self-start"
        >
          Apply filters
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            watching={watchlistIds.includes(character.id)}
            commentCount={getCommentCount(character.id)}
          />
        ))}
      </div>
    </div>
  );
}
