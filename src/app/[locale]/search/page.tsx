import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { isPublicLocale, localePath, pick } from "@/components/acg-locale";
import { normalizeSearchQuery, searchPublicContent } from "@/lib/public-search";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string | string[] }> }) {
  const [{ locale }, search] = await Promise.all([params, searchParams]);
  if (!isPublicLocale(locale)) notFound();
  const features = getExchangeFeatureFlags();
  const query = normalizeSearchQuery(search.q);
  const results = await searchPublicContent(query, locale);
  const groups = [
    { title: pick(locale, "Characters", "角色"), path: "/character", items: results.characters },
    ...(features.community ? [{ title: pick(locale, "Community posts", "社群貼文"), path: "/posts", items: results.posts }] : []),
    { title: pick(locale, "Series", "作品"), path: "/series", items: results.series },
  ];
  const count = groups.reduce((total, group) => total + group.items.length, 0);
  return <div className="exchange-page">
    <header className="exchange-panel bg-[#283338] p-7 text-white sm:p-10"><p className="exchange-kicker text-[#f0c884]">{pick(locale, "FIND A SIGNAL", "尋找訊號")}</p><h1 className="mt-5 font-display text-5xl">{pick(locale, "Search the shelves", "搜尋收藏書架")}</h1><p className="mt-4 text-sm leading-7 text-white/70">{features.community ? pick(locale, "Find public characters, published posts, and series in one place.", "一次尋找公開角色、已刊登貼文與作品。") : pick(locale, "Find public characters and series in one place.", "一次尋找公開角色與作品。")}</p><form action={localePath(locale, "/search")} method="get" className="mt-7 flex flex-wrap gap-3"><label className="min-w-0 flex-1"><span className="sr-only">{pick(locale, "Search query", "搜尋關鍵字")}</span><input type="search" name="q" defaultValue={query} maxLength={120} placeholder={features.community ? pick(locale, "Character, post, or series…", "角色、貼文或作品…") : pick(locale, "Character or series…", "角色或作品…")} className="w-full rounded-[14px_4px_14px_4px] border border-white/20 bg-white px-4 py-3 text-[#283338]" /></label><button type="submit" className="exchange-button-primary"><Search className="h-4 w-4" />{pick(locale, "Search", "搜尋")}</button></form></header>
    {!query ? <p className="exchange-panel p-7 text-sm text-[#716862]">{pick(locale, "Enter a name, title, or keyword to begin.", "輸入名稱、標題或關鍵字開始搜尋。")}</p> : <>
      <p role="status" className="text-sm text-[#716862]">{count ? pick(locale, `Results for “${query}” · up to 12 per shelf. Refine your keywords to find more.`, `「${query}」的結果 · 每個書架最多 12 項，可調整關鍵字尋找更多。`) : pick(locale, `No public results for “${query}”. Try a different keyword.`, `找不到「${query}」的公開結果，試試其他關鍵字。`)}</p>
      {groups.map((group) => <section key={group.path} className="grid gap-5"><h2 className="font-display text-3xl">{group.title} <span className="text-lg text-[#9a4c4a]">{group.items.length}</span></h2>{group.items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{group.items.map((item) => <Link key={item.id} href={localePath(locale, `${group.path}/${encodeURIComponent(item.slug)}`)} className="exchange-panel p-5 transition hover:-translate-y-1"><h3 className="font-display text-2xl">{item.title}</h3><p className="mt-3 break-words text-sm leading-7 text-[#716862]">{item.summary}</p></Link>)}</div> : <p className="text-sm text-[#716862]">{pick(locale, "No matching public entries on this shelf.", "此書架沒有符合的公開項目。")}</p>}</section>)}
    </>}
  </div>;
}
