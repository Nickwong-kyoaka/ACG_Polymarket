import { SlidersHorizontal } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterCard } from "@/components/character-card";
import { isPublicLocale, localePath } from "@/components/acg-locale";
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
  const copy = locale === "zh-Hant" ? { eyebrow: "角色場刊索引", title: "找到今天想靠近的角色。", body: "按作品季別、角色氣質、陪伴需求與來源狀態探索。熱度只計最近買入份數與獨立應援者，不建立輸家榜。", searchLabel: "關鍵字", tagLabel: "角色標籤", sourceLabel: "素材來源", seasonLabel: "作品季別", moodLabel: "陪伴氣質", search: "搜尋角色、作品或關鍵字", tag: "例如：安慰、冷靜", allRights: "所有來源", original: "原創角色", metadata: "資料型角色", allSeasons: "所有季別", allMoods: "所有氣質", sortSupport: "24 小時應援熱度", sortQuote: "目前價格", sortNew: "最新上架", watching: "只看關注中", apply: "套用篩選", found: `找到 ${cards.length} 個角色`, empty: "目前沒有符合條件的角色，試著放寬篩選。", tape: "今日應援行情", unit: "SUP / 份", fans: "位新應援者" } : { eyebrow: "Character catalog index", title: "Find the character you want nearby today.", body: "Explore by season, mood, comfort need, and source status. Trending uses recent buy units and unique supporters, never churn or a loser board.", searchLabel: "Keyword", tagLabel: "Character tag", sourceLabel: "Source lane", seasonLabel: "Release season", moodLabel: "Comfort mood", search: "Search character, series, or keyword", tag: "e.g. comfort, calm", allRights: "All source types", original: "Original characters", metadata: "Metadata signals", allSeasons: "All seasons", allMoods: "All moods", sortSupport: "24h support activity", sortQuote: "Current quote", sortNew: "Newest listing", watching: "Watching only", apply: "Apply filters", found: `${cards.length} characters`, empty: "No character matches these filters yet. Try opening the range.", tape: "Today's support tape", unit: "SUP / unit", fans: "new supporters" };

  return <div><SeasonTicker locale={locale} /><div className="exchange-page">
    <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.body} /><div className="border border-black bg-[#182033] px-5 py-4 text-sm font-black text-white"><span className="mr-2 text-[#f2ca61]">◆</span>{copy.found}</div></header>
    <section aria-label={copy.tape} className="market-tape lg:grid-cols-5">
      {feed.items.slice(0, 5).map((item, index) => <a key={item.id} href={localePath(locale, `/character/${item.slug}`)} className="border-b border-white/15 p-4 last:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0"><div className="flex items-center justify-between gap-3"><span className="font-display text-xl text-[#f2ca61]">{String(index + 1).padStart(2, "0")}</span><span className="text-[9px] font-black tracking-[.12em] text-white/40">24H +{item.activity24h.buyUnits}</span></div><p className="mt-3 truncate text-sm font-black">{item.name}</p><div className="mt-2 flex items-end justify-between gap-3"><span className="text-xl font-black">{item.currentQuote}</span><span className="text-right text-[9px] leading-4 text-white/45">{copy.unit}<br />{item.activity24h.uniqueSupporters} {copy.fans}</span></div></a>)}
    </section>
    <form className="exchange-panel grid gap-4 p-5 sm:p-6 lg:grid-cols-12">
      <label className="grid gap-2 lg:col-span-4"><span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{copy.searchLabel}</span><input className="filter-field" type="search" name="search" defaultValue={search} placeholder={copy.search} /></label>
      <label className="grid gap-2 lg:col-span-2"><span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{copy.tagLabel}</span><input className="filter-field" name="tag" defaultValue={tag} placeholder={copy.tag} /></label>
      <label className="grid gap-2 lg:col-span-2"><span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{copy.sourceLabel}</span><select className="filter-field" name="rightsType" defaultValue={rightsType}><option value="">{copy.allRights}</option><option value="ORIGINAL">{copy.original}</option><option value="LICENSED">{copy.metadata}</option></select></label>
      <label className="grid gap-2 lg:col-span-2"><span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{copy.seasonLabel}</span><select className="filter-field" name="season" defaultValue={season}><option value="">{copy.allSeasons}</option>{seasons.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
      <label className="grid gap-2 lg:col-span-2"><span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{copy.moodLabel}</span><select className="filter-field" name="mood" defaultValue={mood}><option value="">{copy.allMoods}</option>{moods.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
      <div className="flex flex-wrap items-end gap-3 lg:col-span-12">
        <select className="filter-field max-w-52" name="sort" defaultValue={sort}><option value="support">{copy.sortSupport}</option><option value="quote">{copy.sortQuote}</option><option value="new">{copy.sortNew}</option></select>
        <label className="inline-flex items-center gap-2 border border-black bg-[#eee7da] px-4 py-3 text-sm font-bold text-slate-700"><input type="checkbox" name="watching" value="true" defaultChecked={watchedOnly} className="accent-[#e64632]" />{copy.watching}</label>
        <button className="exchange-button-primary" type="submit"><SlidersHorizontal className="h-4 w-4" />{copy.apply}</button>
      </div>
    </form>
    {cards.length ? <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">{cards.map(({ character, comments }) => { const metrics = feedById.get(character.id); const image = metrics?.primaryImage?.url ? { publicUrl: metrics.primaryImage.url, altText: metrics.primaryImage.altText, sourceLabel: metrics.primaryImage.sourceLabel, sourceKind: metrics.primaryImage.sourceKind, permissionStatus: metrics.primaryImage.permissionStatus } : undefined; return <div key={character.id} id={character.slug} className="scroll-mt-28"><CharacterCard character={character} watching={watchlistIds.includes(character.id)} commentCount={comments} locale={locale} activity24h={metrics?.activity24h} campaign={metrics?.campaign} asset={image} /></div>; })}</div> : <div className="exchange-panel p-10 text-center text-slate-500">{copy.empty}</div>}
  </div></div>;
}
