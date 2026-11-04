"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowRight, BookOpen, LoaderCircle, RefreshCcw, Sparkles } from "lucide-react";
import { localePath, stripLocale, type PublicLocale } from "@/components/acg-locale";
import { SocialNoteCard } from "@/components/social-note-card";
import type { SocialFeedTab, SocialNote } from "@/components/social-note-types";
import { feedErrorMessage, feedSessionKey, feedTab, readFeedPosition, requestFeedPage, writeFeedPosition, type FeedPosition } from "@/components/social-feed-session";

interface SocialFeedProps {
  locale: PublicLocale;
  signedIn: boolean;
  viewerId?: string | null;
  initialItems: SocialNote[];
}

export function SocialFeed(props: SocialFeedProps) {
  return <Suspense fallback={<SocialFeedSkeleton locale={props.locale} />}><FeedRoute {...props} /></Suspense>;
}

function FeedRoute({ locale, signedIn, viewerId }: SocialFeedProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tab = feedTab(searchParams.get("feed"));
  const [focusTab, setFocusTab] = useState<SocialFeedTab | null>(null);
  // Without an identified session, never reuse another signed-in viewer's position.
  const identity = signedIn ? (viewerId ? `user:${viewerId}` : null) : "anonymous";
  const key = feedSessionKey(identity, locale, stripLocale(pathname), tab);
  return <FeedContent key={`${identity}:${locale}:${pathname}:${tab}`} locale={locale} signedIn={signedIn} tab={tab} storageKey={key} pathname={pathname} focusSelected={focusTab === tab} onSelect={setFocusTab} />;
}

function FeedContent({ locale, signedIn, tab, storageKey, pathname, focusSelected, onSelect }: { locale: PublicLocale; signedIn: boolean; tab: SocialFeedTab; storageKey: string | null; pathname: string; focusSelected: boolean; onSelect: (tab: SocialFeedTab) => void }) {
  const zh = locale === "zh-Hant";
  const id = useId();
  const root = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const pageCount = useRef(0);
  const busy = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const restorePosition = useRef<FeedPosition | null>(null);
  const [items, setItems] = useState<SocialNote[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (focusSelected) tabsRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
  }, [focusSelected]);

  useLayoutEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    const saved = readFeedPosition(storageKey);
    restorePosition.current = saved;
    pageCount.current = 0;
    async function load() {
      setLoading(true);
      setLoadingMore(false);
      busy.current = false;
      setItems([]);
      setNextCursor(null);
      setError("");
      if (tab === "following" && !signedIn) { setLoading(false); return; }
      let cursor: string | null = null;
      const verified: SocialNote[] = [];
      const seen = new Set<string>();
      try {
        // Replay from the current first page and its current cursors, not old DTOs.
        for (let page = 0; page < (saved?.pages ?? 1); page++) {
          const payload = await requestFeedPage(locale, tab, cursor, controller.signal);
          if (controller.signal.aborted) return;
          verified.push(...payload.items.filter((item) => !verified.some((existing) => existing.id === item.id)));
          pageCount.current++;
          cursor = payload.nextCursor;
          setItems([...verified]);
          setNextCursor(cursor);
          if (!cursor || seen.has(cursor)) { setNextCursor(null); break; }
          seen.add(cursor);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) setError(feedErrorMessage(requestError, zh));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [locale, revision, signedIn, storageKey, tab, zh]);

  useEffect(() => {
    function revalidate(event: PageTransitionEvent) {
      if (event.persisted) flushSync(() => setRevision((value) => value + 1));
    }
    window.addEventListener("pageshow", revalidate);
    return () => window.removeEventListener("pageshow", revalidate);
  }, []);

  useEffect(() => {
    if (loading || loadingMore || !pageCount.current) return;
    const position = restorePosition.current;
    if (!position) return;
    const frame = requestAnimationFrame(() => {
      const anchor = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-feed-note]") ?? [])
        .find((element) => element.dataset.feedNote === position.anchor?.id);
      if (anchor || !nextCursor || pageCount.current >= position.pages) restorePosition.current = null;
      window.scrollTo({ top: anchor && position.anchor ? Math.max(0, window.scrollY + anchor.getBoundingClientRect().top - position.anchor.top) : position.scrollY, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [items, loading, loadingMore, nextCursor]);

  useEffect(() => {
    function remember() {
      if (!pageCount.current || loading) return;
      const cards = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-feed-note]") ?? []);
      const anchor = cards.find((element) => element.getBoundingClientRect().bottom > 0);
      writeFeedPosition(storageKey, restorePosition.current ?? {
        pages: pageCount.current,
        scrollY: window.scrollY,
        anchor: anchor ? { id: anchor.dataset.feedNote!, top: anchor.getBoundingClientRect().top } : null,
      });
    }
    // Capture before links navigate; scroll/pagehide cover browser Back and reload.
    document.addEventListener("click", remember, true);
    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("pagehide", remember);
    return () => {
      document.removeEventListener("click", remember, true);
      window.removeEventListener("scroll", remember);
      window.removeEventListener("pagehide", remember);
    };
  }, [loading, storageKey]);

  function selectTab(value: SocialFeedTab) {
    if (value === tab) return;
    const url = new URL(window.location.href);
    url.searchParams.set("feed", value);
    onSelect(value);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  async function loadMore() {
    const controller = controllerRef.current;
    if (!nextCursor || busy.current || !controller || controller.signal.aborted) return;
    busy.current = true;
    setLoadingMore(true);
    setError("");
    try {
      const payload = await requestFeedPage(locale, tab, nextCursor, controller.signal);
      if (controller.signal.aborted) return;
      setItems((current) => [...current, ...payload.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
      pageCount.current++;
      setNextCursor(payload.nextCursor === nextCursor ? null : payload.nextCursor);
    } catch (requestError) {
      if (!controller.signal.aborted) setError(feedErrorMessage(requestError, zh));
    } finally {
      busy.current = false;
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }

  const tabs: Array<{ key: SocialFeedTab; en: string; zh: string }> = [
    { key: "for-you", en: "For you", zh: "為你推薦" },
    { key: "following", en: "Following", zh: "正在關注" },
    { key: "seasonal", en: "Seasonal", zh: "本季新番" },
  ];
  const returnPath = `${pathname}?feed=${tab}`;

  return (
    <section ref={root} className="community-feed social-feed-candidate [&_button]:min-h-11 [&_button]:min-w-11 [&_a]:min-h-11" aria-busy={loading}>
      <div ref={tabsRef} className="community-tabs" role="tablist" aria-label={zh ? "社群內容分類" : "Community feeds"} onKeyDown={(event) => {
        const index = tabs.findIndex((entry) => entry.key === tab);
        const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
        if (next < 0) return;
        event.preventDefault();
        tabsRef.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
        selectTab(tabs[next].key);
      }}>
        {tabs.map((entry) => <button key={entry.key} id={`${id}-${entry.key}`} type="button" role="tab" aria-selected={tab === entry.key} aria-controls={`${id}-panel`} tabIndex={tab === entry.key ? 0 : -1} className={tab === entry.key ? "is-active" : ""} onClick={() => selectTab(entry.key)}><strong>{zh ? entry.zh : entry.en}</strong></button>)}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} tabIndex={0}>
        {loading ? <SocialFeedSkeleton locale={locale} /> : tab === "following" && !signedIn ? (
          <div className="community-state"><BookOpen /><h2>{zh ? "登入後查看關注更新" : "Sign in to see followed content"}</h2><p>{zh ? "你關注的創作者、角色和話題會顯示在這裡。" : "Updates from creators, characters, and topics you follow appear here."}</p><Link href={`${localePath(locale, "/onboarding")}?next=${encodeURIComponent(returnPath)}`}>{zh ? "前往登入" : "Sign in"}<ArrowRight /></Link></div>
        ) : error && items.length === 0 ? (
          <div className="community-state is-error" role="alert"><RefreshCcw /><h2>{zh ? "無法載入內容" : "Feed could not load"}</h2><p>{error}</p><button type="button" onClick={() => setRevision((value) => value + 1)}>{zh ? "重新載入" : "Try again"}</button></div>
        ) : items.length === 0 ? (
          <div className="community-state"><Sparkles /><h2>{tab === "following" ? (zh ? "暫無關注更新" : "No followed updates yet") : tab === "seasonal" ? (zh ? "暫無本季筆記" : "No seasonal notes yet") : (zh ? "暫無公開筆記" : "No public notes yet")}</h2><p>{tab === "following" ? (zh ? "關注創作者、角色或話題；有公開更新時便會顯示。" : "Follow creators, characters, or topics to see their public updates.") : (zh ? "稍後再回來，或發布你的第一篇筆記。" : "Check back later or create your first note.")}</p><Link href={localePath(locale, tab === "following" ? "/market" : "/create")}>{tab === "following" ? (zh ? "探索角色" : "Explore characters") : (zh ? "寫筆記" : "Write a note")}<ArrowRight /></Link></div>
        ) : (
          <>
            <div className="social-note-grid">{items.map((note) => <SocialNoteCard key={note.id} note={note} locale={locale} feed={tab} feedFrom={stripLocale(pathname) === "/" ? "home" : "community"} />)}</div>
            <div className="community-feed-footer">{error ? <><p role="alert">{error}</p><button type="button" disabled={loadingMore} onClick={() => setRevision((value) => value + 1)}>{zh ? "重新載入內容流" : "Reload feed"}</button></> : null}{nextCursor ? <button type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? <LoaderCircle className="animate-spin" /> : null}{loadingMore ? (zh ? "載入中…" : "Loading…") : error ? (zh ? "重試載入更多" : "Retry loading more") : (zh ? "載入更多" : "Load more")}</button> : <span>{zh ? "已顯示全部內容" : "You are all caught up"}</span>}</div>
          </>
        )}
      </div>
    </section>
  );
}

export function SocialFeedSkeleton({ locale = "en" }: { locale?: PublicLocale }) {
  return <div className="social-note-grid" role="status" aria-label={locale === "zh-Hant" ? "載入中" : "Loading"}><div className="social-note-skeleton" /><div className="social-note-skeleton" /><div className="social-note-skeleton" /><div className="social-note-skeleton" /><div className="social-note-skeleton" /><div className="social-note-skeleton" /></div>;
}
