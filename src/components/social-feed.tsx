"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, LoaderCircle, RefreshCcw, Sparkles } from "lucide-react";
import { localePath, type PublicLocale } from "@/components/acg-locale";
import { SocialNoteCard } from "@/components/social-note-card";
import { normalizeFeedPayload, type SocialFeedPayload, type SocialFeedTab, type SocialNote } from "@/components/social-note-types";

interface MarketFallbackItem {
  id: string;
  slug: string;
  name: string;
  title: string;
  seriesTitle?: string;
  tags?: string[];
  accentFrom?: string;
  accentTo?: string;
  supporterCount?: number;
  primaryImage?: { url?: string | null; altText?: string; sourceLabel?: string | null } | null;
  social?: { comments?: number; reactions?: number };
}

function fallbackNote(item: MarketFallbackItem, locale: PublicLocale): SocialNote {
  const zh = locale === "zh-Hant";
  return {
    id: `character-${item.id}`,
    slug: item.slug,
    href: `/character/${item.slug}`,
    kind: "CHARACTER NOTE",
    title: item.name,
    body: item.title || (zh ? `來自 ${item.seriesTitle ?? "角色目錄"} 的最新角色手帳。` : `A fresh character note from ${item.seriesTitle ?? "the catalog"}.`),
    publishedAt: null,
    viewCount: item.supporterCount ?? 0,
    recommendationReason: zh ? "來自本季角色目錄" : "From the seasonal character desk",
    author: { id: "editorial", handle: "acg-desk", displayName: zh ? "ACG 編輯桌" : "ACG Exchange Desk", imageUrl: null },
    character: { id: item.id, slug: item.slug, name: item.name, title: item.title, accentFrom: item.accentFrom ?? "#c85d5a", accentTo: item.accentTo ?? "#5f8f87" },
    series: item.seriesTitle ? { id: item.seriesTitle, slug: "", title: item.seriesTitle } : null,
    media: [{ id: `${item.id}-cover`, url: item.primaryImage?.url ?? null, altText: item.primaryImage?.altText ?? `${item.name} character visual`, sourceLabel: item.primaryImage?.sourceLabel ?? null, sourceUrl: null }],
    topics: (item.tags ?? []).slice(0, 3).map((tag) => ({ slug: tag, title: tag })),
    counts: { saves: 0, reactions: item.social?.reactions ?? 0, comments: item.social?.comments ?? 0 },
    viewer: { saved: false, followingAuthor: false, followingCharacter: false },
  };
}

async function loadExistingPublicFallback(locale: PublicLocale) {
  const response = await fetch(`/api/market/feed?locale=${encodeURIComponent(locale)}&limit=20&sort=trending`, { cache: "no-store" });
  if (!response.ok) throw new Error("fallback unavailable");
  const payload = await response.json() as { items?: MarketFallbackItem[] };
  return (payload.items ?? []).map((item) => fallbackNote(item, locale));
}

export function SocialFeed({ locale, signedIn, initialItems }: { locale: PublicLocale; signedIn: boolean; initialItems: SocialNote[] }) {
  const zh = locale === "zh-Hant";
  const [tab, setTab] = useState<SocialFeedTab>("for-you");
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialItems.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (tab === "following" && !signedIn) {
        setItems([]);
        setNextCursor(null);
        setLoading(false);
        setError("");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ locale, tab, feed: tab, limit: "20" });
        const response = await fetch(`/api/feed?${params}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const normalized = normalizeFeedPayload(await response.json());
        if (!normalized) throw new Error("invalid feed");
        setItems(normalized.items);
        setNextCursor(normalized.nextCursor);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        try {
          const fallback = await loadExistingPublicFallback(locale);
          setItems(tab === "for-you" ? (initialItems.length ? initialItems : fallback) : fallback);
          setNextCursor(null);
          setError("");
        } catch {
          setItems(initialItems);
          setError(requestError instanceof Error ? requestError.message : "feed unavailable");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [initialItems, locale, revision, signedIn, tab]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ locale, tab, feed: tab, limit: "20", cursor: nextCursor });
      const response = await fetch(`/api/feed?${params}`, { cache: "no-store" });
      const payload: SocialFeedPayload | null = response.ok ? normalizeFeedPayload(await response.json()) : null;
      if (!payload) throw new Error("page unavailable");
      setItems((current) => [...current, ...payload.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setNextCursor(payload.nextCursor);
    } catch {
      setError(zh ? "下一頁暫時沒有送到，再試一次就好。" : "The next page did not arrive. Try once more.");
    } finally {
      setLoadingMore(false);
    }
  }

  const tabs: Array<{ key: SocialFeedTab; en: string; zh: string; noteEn: string; noteZh: string }> = [
    { key: "for-you", en: "For you", zh: "為你推薦", noteEn: "A mix from your shelf", noteZh: "從你的書架慢慢挑選" },
    { key: "following", en: "Following", zh: "正在關注", noteEn: "People and characters you keep", noteZh: "你留下的角色與創作者" },
    { key: "seasonal", en: "Seasonal", zh: "本季新番", noteEn: "Fresh notes from this season", noteZh: "這一季剛翻開的新頁" },
  ];

  return (
    <section className="community-feed" aria-busy={loading}>
      <div className="community-tabs" role="tablist" aria-label={zh ? "社群內容分類" : "Community feeds"}>
        {tabs.map((entry) => <button key={entry.key} type="button" role="tab" aria-selected={tab === entry.key} className={tab === entry.key ? "is-active" : ""} onClick={() => setTab(entry.key)}><strong>{zh ? entry.zh : entry.en}</strong><small>{zh ? entry.noteZh : entry.noteEn}</small></button>)}
      </div>

      {loading ? <SocialFeedSkeleton /> : tab === "following" && !signedIn ? (
        <div className="community-state"><BookOpen /><span>FOLLOWING SHELF</span><h2>{zh ? "登入後，把喜歡的頁面收在這裡。" : "Sign in and keep your favorite pages here."}</h2><p>{zh ? "先選幾名角色和話題，之後的新筆記就會回到這張桌上。" : "Choose a few characters and topics, and their new notes will return to this desk."}</p><Link href={`${localePath(locale, "/onboarding")}?next=${encodeURIComponent(localePath(locale, "/community"))}`}>{zh ? "打開我的房間" : "Open my room"}<ArrowRight /></Link></div>
      ) : error && items.length === 0 ? (
        <div className="community-state is-error"><RefreshCcw /><span>FEED PAUSED</span><h2>{zh ? "手帳剛好卡在書架後面。" : "The notebook slipped behind the shelf."}</h2><p>{zh ? "重新整理一次，我們會再把內容排回桌上。" : "Try again and we will place the notes back on the desk."}</p><button type="button" onClick={() => setRevision((value) => value + 1)}>{zh ? "再整理一次" : "Try again"}</button></div>
      ) : items.length === 0 ? (
        <div className="community-state"><Sparkles /><span>EMPTY PAGE</span><h2>{zh ? "這一頁正等著第一篇筆記。" : "This page is waiting for its first note."}</h2><p>{zh ? "可以先逛角色，也可以寫下今天最想收藏的一幕。" : "Browse a character or write down the scene you want to keep today."}</p><Link href={localePath(locale, "/create")}>{zh ? "寫第一篇" : "Write the first one"}<ArrowRight /></Link></div>
      ) : (
        <>
          <div className="social-note-grid">{items.map((note, index) => <SocialNoteCard key={note.id} note={note} locale={locale} priority={index === 0} />)}</div>
          <div className="community-feed-footer">{error ? <p>{error}</p> : null}{nextCursor ? <button type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? <LoaderCircle className="animate-spin" /> : null}{loadingMore ? (zh ? "正在翻頁…" : "Turning the page…") : (zh ? "再看一些" : "Keep browsing")}</button> : <span>{zh ? "這一期先看到這裡。" : "You have reached the end of this issue."}</span>}</div>
        </>
      )}
    </section>
  );
}

export function SocialFeedSkeleton() {
  return <div className="social-note-grid" aria-label="Loading"><div className="social-note-skeleton tall" /><div className="social-note-skeleton" /><div className="social-note-skeleton" /><div className="social-note-skeleton tall" /><div className="social-note-skeleton" /><div className="social-note-skeleton" /></div>;
}
