import { SlidersHorizontal } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterCard } from "@/components/character-card";
import { isPublicLocale } from "@/components/acg-locale";
import { SeasonTicker } from "@/components/season-ticker";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCommentCount, getWatchlistIds, listCharacters } from "@/lib/store";
import { getPositiveMarketFeed } from "@/lib/market-feed";
import { getBuyQuote } from "@/lib/market";

export const dynamic = "force-dynamic";

export default async function MarketPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const value = (key: string) => typeof query[key] === "string" ? query[key] as string : "";
  const search = value("search");
  const tag = value("tag");
  const rightsType = value("rightsType");
  const season = value("season");
  const mood = value("mood");
  const watchedOnly = value("watching") === "true";
  const sort = value("sort") || "support";
  const feedSort = sort === "new" ? "newest" : sort === "quote" ? "quote-desc" : sort === "supporters" ? "supporters" : "trending";
  const [sourceCharacters, watchlistIds, feed] = await Promise.all([listCharacters({ search: search || undefined, tag: tag || undefined, rightsType: rightsType || undefined, locale }), getWatchlistIds().catch(() => [] as string[]), getPositiveMarketFeed({ limit: 50, search: search || undefined, tag: tag || undefined, rightsType: rightsType === "ORIGINAL" || rightsType === "LICENSED" ? rightsType : undefined, locale, sort: feedSort })]);
  const feedById = new Map(feed.items.map((item) => [item.id, item]));
  const feedOrder = new Map(feed.items.map((item, index) => [item.id, index]));
  let characters = sourceCharacters.filter((character) => (!season || character.releaseSeason === season) && (!mood || character.mood.toLowerCase() === mood.toLowerCase()) && (!watchedOnly || watchlistIds.includes(character.id)));
  characters = [...characters].sort((a, b) => sort === "quote" ? getBuyQuote(b) - getBuyQuote(a) : (feedOrder.get(a.id) ?? 999) - (feedOrder.get(b.id) ?? 999));
  const cards = await Promise.all(characters.map(async (character) => ({ character, comments: await getCommentCount(character.id) })));
  const seasons = [...new Set(sourceCharacters.map((character) => character.releaseSeason).filter(Boolean))] as string[];
  const moods = [...new Set(sourceCharacters.map((character) => character.mood).filter(Boolean))];
  const copy = locale === "zh-Hant" ? { eyebrow: "SIGNAL DIRECTORY", title: "找到今天最對頻的角色。", body: "按作品季別、角色氣質、陪伴需求與來源狀態探索。熱度只計最近買入份數與獨立應援者，不建立輸家榜。", search: "搜尋角色、作品或關鍵字", tag: "標籤，例如 comfort", allRights: "所有來源", original: "原創角色", metadata: "資料型角色", allSeasons: "所有季別", allMoods: "所有氣質", sortSupport: "24h 應援熱度", sortQuote: "目前價格", sortNew: "最新上架", watching: "只看關注中", apply: "更新訊號", found: `找到 ${cards.length} 個訊號`, empty: "目前沒有符合條件的角色訊號，試著放寬篩選。" } : { eyebrow: "SIGNAL DIRECTORY", title: "Find the character on your frequency today.", body: "Explore by season, mood, comfort need, and source status. Trending uses recent buy units and unique supporters, never churn or a loser board.", search: "Search character, series, or keyword", tag: "Tag, e.g. comfort", allRights: "All source types", original: "Original characters", metadata: "Metadata signals", allSeasons: "All seasons", allMoods: "All moods", sortSupport: "24h support heat", sortQuote: "Current quote", sortNew: "Newest listing", watching: "Watching only", apply: "Tune signals", found: `${cards.length} signals found`, empty: "No character signal matches these filters yet. Try opening the range." };

  return <div><SeasonTicker locale={locale} /><div className="exchange-page">
    <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.body} /><div className="rounded-[18px_5px_18px_5px] bg-[#111827] px-5 py-4 text-sm font-black text-white"><span className="mr-2 text-[#3ed6e0]">●</span>{copy.found}</div></header>
    <form className="exchange-panel grid gap-4 p-5 sm:p-6 lg:grid-cols-12">
      <label className="grid gap-2 lg:col-span-4"><span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">SEARCH</span><input className="filter-field" type="search" name="search" defaultValue={search} placeholder={copy.search} /></label>
      <label className="grid gap-2 lg:col-span-2"><span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">TAG</span><input className="filter-field" name="tag" defaultValue={tag} placeholder={copy.tag} /></label>
      <label className="grid gap-2 lg:col-span-2"><span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">SOURCE</span><select className="filter-field" name="rightsType" defaultValue={rightsType}><option value="">{copy.allRights}</option><option value="ORIGINAL">{copy.original}</option><option value="LICENSED">{copy.metadata}</option></select></label>
      <label className="grid gap-2 lg:col-span-2"><span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">SEASON</span><select className="filter-field" name="season" defaultValue={season}><option value="">{copy.allSeasons}</option>{seasons.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
      <label className="grid gap-2 lg:col-span-2"><span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">MOOD</span><select className="filter-field" name="mood" defaultValue={mood}><option value="">{copy.allMoods}</option>{moods.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
      <div className="flex flex-wrap items-end gap-3 lg:col-span-12">
        <select className="filter-field max-w-52" name="sort" defaultValue={sort}><option value="support">{copy.sortSupport}</option><option value="quote">{copy.sortQuote}</option><option value="new">{copy.sortNew}</option></select>
        <label className="inline-flex items-center gap-2 rounded-[14px_4px_14px_4px] border border-black/10 bg-[#f5f1e8] px-4 py-3 text-sm font-bold text-slate-600"><input type="checkbox" name="watching" value="true" defaultChecked={watchedOnly} className="accent-[#ff4e72]" />{copy.watching}</label>
        <button className="exchange-button-primary" type="submit"><SlidersHorizontal className="h-4 w-4" />{copy.apply}</button>
      </div>
    </form>
    {cards.length ? <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">{cards.map(({ character, comments }) => { const metrics = feedById.get(character.id); const image = metrics?.primaryImage?.url ? { publicUrl: metrics.primaryImage.url, altText: metrics.primaryImage.altText } : undefined; return <CharacterCard key={character.id} character={character} watching={watchlistIds.includes(character.id)} commentCount={comments} locale={locale} activity24h={metrics?.activity24h} campaign={metrics?.campaign} asset={image} />; })}</div> : <div className="exchange-panel p-10 text-center text-slate-500">{copy.empty}</div>}
  </div></div>;
}
