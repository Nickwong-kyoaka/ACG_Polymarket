import type { PublicLocale } from "@/components/acg-locale";
import { normalizeFeedPayload, type SocialFeedTab } from "@/components/social-note-types";

export function feedTab(value: string | null): SocialFeedTab {
  return value === "following" || value === "seasonal" ? value : "for-you";
}

export interface FeedPosition {
  pages: number;
  anchor: { id: string; top: number } | null;
  scrollY: number;
}

export function feedSessionKey(viewerId: string | null, locale: PublicLocale, path: string, tab: SocialFeedTab) {
  return viewerId === null ? null : `acg-feed-v1:${encodeURIComponent(viewerId)}:${locale}:${path}:${tab}`;
}

// Persist navigation metadata only, never post text, media URLs, or viewer signals.
export function readFeedPosition(key: string | null): FeedPosition | null {
  if (!key) return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (!value || !Number.isInteger(value.pages) || value.pages < 1 || value.pages > 100 || !Number.isFinite(value.scrollY)) return null;
    return {
      pages: value.pages,
      scrollY: Math.max(0, value.scrollY),
      anchor: value.anchor && typeof value.anchor.id === "string" && Number.isFinite(value.anchor.top)
        ? { id: value.anchor.id, top: value.anchor.top } : null,
    };
  } catch { return null; }
}

export function writeFeedPosition(key: string | null, value: FeedPosition) {
  if (!key) return;
  try { sessionStorage.setItem(key, JSON.stringify({ pages: Math.min(value.pages, 100), anchor: value.anchor ? { id: value.anchor.id, top: value.anchor.top } : null, scrollY: value.scrollY })); } catch { /* Storage is optional. */ }
}

export class FeedRequestError extends Error {
  constructor(public status: number) { super("Feed request failed"); }
}

export async function requestFeedPage(locale: PublicLocale, tab: SocialFeedTab, cursor: string | null, signal: AbortSignal) {
  const params = new URLSearchParams({ locale, feed: tab, limit: "20" });
  if (cursor) params.set("cursor", cursor);
  const response = await fetch(`/api/feed?${params}`, { cache: "no-store", signal });
  if (!response.ok) throw new FeedRequestError(response.status);
  const payload = normalizeFeedPayload(await response.json());
  if (!payload) throw new FeedRequestError(502);
  return payload;
}

export function feedErrorMessage(error: unknown, zh: boolean) {
  const status = error instanceof FeedRequestError ? error.status : 0;
  if (status === 401) return zh ? "登入已過期，請重新登入後再試。" : "Your session expired. Sign in again to continue.";
  if (status === 403) return zh ? "目前無權查看這些內容。請切換分類或稍後再試。" : "You cannot view this feed. Choose another tab or try again later.";
  if (status === 404) return zh ? "此內容流目前無法使用。請切換分類。" : "This feed is unavailable. Choose another tab.";
  if (status === 409) return zh ? "內容已更新，請重新載入。" : "The feed has changed. Reload to continue.";
  return zh ? "無法載入內容。請檢查網絡連線後重試。" : "Could not load the feed. Check your connection and try again.";
}
