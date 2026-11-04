import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterCard } from "@/components/character-card";
import { isPublicLocale, localePath, localizeReleaseSeason } from "@/components/acg-locale";
import { SeasonTicker } from "@/components/season-ticker";
import { getCommentCount, getWatchlistIds, listCharacters } from "@/lib/store";
import { getPositiveMarketFeed } from "@/lib/market-feed";
import { getBuyQuote } from "@/lib/market";

export const dynamic = "force-dynamic";

export default async function MarketPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isPublicLocale(locale)) notFound();
  const zh = locale === "zh-Hant";
  const value = (key: string) => typeof query[key] === "string" ? query[key] as string : "";
  const search = value("search"), tag = value("tag"), season = value("season"), mood = value("mood");
  const rightsType = ["ORIGINAL", "LICENSED"].includes(value("rightsType")) ? value("rightsType") : "";
  const watchedOnly = value("watching") === "true";
  const sort = ["support", "quote", "new", "supporters"].includes(value("sort")) ? value("sort") : "support";
  const feedSort = sort === "new" ? "newest" : sort === "quote" ? "quote-desc" : sort === "supporters" ? "supporters" : "trending";
  const [sourceCharacters, watchlistIds, feed] = await Promise.all([
    listCharacters({ search: search || undefined, tag: tag || undefined, rightsType: rightsType || undefined, locale }),
    getWatchlistIds().catch(() => [] as string[]),
    getPositiveMarketFeed({ limit: 50, search: search || undefined, tag: tag || undefined, rightsType: rightsType === "ORIGINAL" || rightsType === "LICENSED" ? rightsType : undefined, locale, sort: feedSort }),
  ]);
  const feedById = new Map(feed.items.map((item) => [item.id, item]));
  const order = new Map(feed.items.map((item, index) => [item.id, index]));
  const characters = sourceCharacters.filter((item) => (!season || item.releaseSeason === season) && (!mood || item.mood.toLowerCase() === mood.toLowerCase()) && (!watchedOnly || watchlistIds.includes(item.id))).sort((a, b) => sort === "quote" ? getBuyQuote(b) - getBuyQuote(a) : (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  const cards = await Promise.all(characters.map(async (character) => ({ character, comments: await getCommentCount(character.id) })));
  const seasons = [...new Set(sourceCharacters.map((item) => item.releaseSeason).filter(Boolean))] as string[];
  const moods = [...new Set(sourceCharacters.map((item) => item.mood).filter(Boolean))];
  const filters = new URLSearchParams();
  for (const [key, entry] of Object.entries({ search, tag, season, mood, rightsType, watching: watchedOnly ? "true" : "", sort: sort === "support" ? "" : sort })) if (entry) filters.set(key, entry);
  const removeFilter = (key: string) => { const next = new URLSearchParams(filters); next.delete(key); return `${localePath(locale, "/market")}${next.size ? `?${next}` : ""}`; };
  return <div className="exchange-page !gap-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-extrabold">{zh ? "角色" : "Characters"}</h1><p className="mt-1 text-sm text-slate-600">{zh ? "找找本命，也認識新的角色。" : "Find your favorites, or meet someone new."}</p></div><span className="text-sm text-slate-500">{cards.length} {zh ? "個角色" : "characters"}</span></header>
    <SeasonTicker locale={locale} />
    <form key={filters.toString()} className="exchange-panel grid gap-4 p-4">
      <div className="flex gap-2"><label className="min-w-0 flex-1"><span className="sr-only">{zh ? "搜尋角色或作品" : "Search characters or series"}</span><input className="filter-field" type="search" name="search" defaultValue={search} placeholder={zh ? "搜尋角色、作品或關鍵字" : "Search character, series, or keyword"} /></label><button className="exchange-button-primary" type="submit"><Search className="h-4 w-4" /><span className="hidden sm:inline">{zh ? "搜尋" : "Search"}</span><span className="sr-only sm:hidden">{zh ? "搜尋" : "Search"}</span></button></div>
      <div className="flex flex-wrap items-center gap-3"><label className="min-w-0"><span className="sr-only">{zh ? "排序" : "Sort characters"}</span><select className="filter-field" name="sort" defaultValue={sort}><option value="support">{zh ? "近期應援" : "Recent support"}</option><option value="quote">{zh ? "應援價格" : "Support quote"}</option><option value="supporters">{zh ? "應援人數" : "Supporters"}</option><option value="new">{zh ? "最新角色" : "New characters"}</option></select></label><label className="inline-flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="watching" value="true" defaultChecked={watchedOnly} className="h-4 w-4 accent-[#c4455c]" />{zh ? "只看關注" : "Watchlist only"}</label></div>
      <details open={Boolean(tag || rightsType || season || mood)}><summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold"><SlidersHorizontal className="h-4 w-4" />{zh ? "更多篩選" : "More filters"}</summary><div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="grid gap-2 text-sm">{zh ? "角色標籤" : "Character tag"}<input className="filter-field" name="tag" defaultValue={tag} /></label><label className="grid gap-2 text-sm">{zh ? "角色類型" : "Character type"}<select className="filter-field" name="rightsType" defaultValue={rightsType}><option value="">{zh ? "全部類型" : "All types"}</option><option value="ORIGINAL">{zh ? "原創角色" : "Original characters"}</option><option value="LICENSED">{zh ? "作品角色" : "Series characters"}</option></select></label><label className="grid gap-2 text-sm">{zh ? "作品季別" : "Release season"}<select className="filter-field" name="season" defaultValue={season}><option value="">{zh ? "全部季別" : "All seasons"}</option>{seasons.map((item) => <option key={item} value={item}>{localizeReleaseSeason(item, locale)}</option>)}</select></label><label className="grid gap-2 text-sm">{zh ? "角色氣質" : "Character mood"}<select className="filter-field" name="mood" defaultValue={mood}><option value="">{zh ? "全部氣質" : "All moods"}</option>{moods.map((item) => <option key={item}>{item}</option>)}</select></label></div></details>
    </form>
    {filters.size ? <div className="flex flex-wrap items-center gap-2" aria-label={zh ? "目前篩選" : "Active filters"}>{[...filters].filter(([key]) => key !== "sort").map(([key, entry]) => <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm" key={key} href={removeFilter(key)} aria-label={`${zh ? "移除篩選" : "Remove filter"}: ${key === "watching" ? (zh ? "關注中" : "Watchlist") : entry}`}>{key === "watching" ? (zh ? "關注中" : "Watchlist") : key === "rightsType" ? (entry === "ORIGINAL" ? (zh ? "原創" : "Original") : (zh ? "作品角色" : "Series characters")) : entry}<X className="h-3.5 w-3.5" /></Link>)}<Link className="inline-flex min-h-11 items-center px-2 text-sm font-bold text-[#c4455c]" href={localePath(locale, "/market")}>{zh ? "清除篩選" : "Clear filters"}</Link></div> : null}
    {cards.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{cards.map(({ character, comments }) => { const metrics = feedById.get(character.id); const image = metrics?.primaryImage?.url ? { publicUrl: metrics.primaryImage.url, altText: metrics.primaryImage.altText, sourceLabel: metrics.primaryImage.sourceLabel, sourceKind: metrics.primaryImage.sourceKind, permissionStatus: metrics.primaryImage.permissionStatus } : undefined; return <div key={character.id} id={character.slug} className="min-w-0 scroll-mt-24"><CharacterCard character={character} watching={watchlistIds.includes(character.id)} commentCount={comments} locale={locale} activity24h={metrics?.activity24h} campaign={metrics?.campaign} asset={image} /></div>; })}</div> : <section className="exchange-panel p-8 text-center"><h2 className="font-bold">{zh ? "沒有符合條件的角色" : "No characters match these filters"}</h2><p className="my-3 text-sm text-slate-500">{zh ? "目前的篩選已保留，可以調整條件再試。" : "Your filters are still here. Adjust them and try again."}</p><Link className="exchange-button-secondary" href={localePath(locale, "/market")}>{zh ? "清除篩選" : "Clear filters"}</Link></section>}
  </div>;
}
