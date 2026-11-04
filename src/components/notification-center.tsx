"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { type PublicLocale } from "@/components/acg-locale";
import { localizeNotification, notificationHref, type NotificationMessage } from "@/lib/notification-copy";

export interface NotificationItem extends NotificationMessage {
  id: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}
export interface NotificationPreferences {
  followedContent: boolean;
  seriesUpdates: boolean;
  predictionChanges: boolean;
  predictionClosing: boolean;
  resolutions: boolean;
  moderationResults: boolean;
}
type NotificationPage = { items: NotificationItem[]; nextCursor: string | null; unreadCount: number };

export function NotificationCenter({ initialItems, initialPreferences, initialNextCursor = null, initialUnreadCount, locale }: { initialItems: NotificationItem[]; initialPreferences: NotificationPreferences; initialNextCursor?: string | null; initialUnreadCount?: number; locale: PublicLocale }) {
  const zh = locale === "zh-Hant";
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [unread, setUnread] = useState(initialUnreadCount ?? initialItems.filter((item) => !item.readAt).length);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");
  const locked = useRef(false);

  async function request(body: unknown) {
    const response = await fetch("/api/me/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error();
  }

  async function run(action: string, operation: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(action); setStatus("");
    try { await operation(); }
    catch { setStatus(zh ? "暫時未能更新，請重試；現有便條已保留。" : "Could not update. Your existing notes are safe; please retry."); }
    finally { locked.current = false; setBusy(""); }
  }

  function markOne(id: string) {
    void run(id, async () => {
      await request({ action: "MARK_READ", id });
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnread((current) => Math.max(0, current - 1));
    });
  }

  function markAll() {
    void run("all", async () => {
      await request({ action: "MARK_ALL_READ" });
      const time = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? time })));
      setUnread(0);
      setStatus(zh ? "全部便條已標記為已讀。" : "All notes marked as read.");
    });
  }

  function changePreference(key: keyof NotificationPreferences) {
    void run(`preference:${key}`, async () => {
      const previous = preferences[key];
      setPreferences((current) => ({ ...current, [key]: !previous }));
      try { await request({ action: "PREFERENCES", preferences: { [key]: !previous } }); }
      catch (error) { setPreferences((current) => ({ ...current, [key]: previous })); throw error; }
      setStatus(zh ? "通知偏好已保存。" : "Notification preference saved.");
    });
  }

  function loadNext() {
    if (!cursor) return;
    void run("next", async () => {
      const response = await fetch(`/api/me/notifications?limit=20&cursor=${encodeURIComponent(cursor)}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const page = await response.json() as NotificationPage;
      if (!Array.isArray(page.items) || typeof page.unreadCount !== "number") throw new Error();
      setItems((current) => {
        const ids = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => { if (ids.has(item.id)) return false; ids.add(item.id); return true; })];
      });
      setCursor(page.nextCursor && page.nextCursor !== cursor ? page.nextCursor : null);
      setUnread(page.unreadCount);
    });
  }

  const labels: Array<[keyof NotificationPreferences, string, string]> = [
    ["followedContent", "Followed creators and characters", "關注的創作者與角色"],
    ["seriesUpdates", "Series and episode updates", "作品與集數更新"],
    ["predictionChanges", "Prediction probability signals", "預測機率訊號"],
    ["predictionClosing", "Prediction closing reminders", "預測截止提醒"],
    ["resolutions", "Resolution results", "預測結算結果"],
    ["moderationResults", "Post and revision reviews", "投稿與修訂審核"],
  ];

  return <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
    <section aria-busy={Boolean(busy)}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2c2724] pb-4"><div><p className="exchange-kicker">{zh ? "通知收件箱" : "INBOX"}</p><h2 className="mt-2 font-display text-3xl">{zh ? "最近回到房間的消息" : "Messages that reached your room"}</h2><p className="mt-2 text-xs font-bold text-[#716862]">{zh ? `${unread} 則未讀便條` : `${unread} unread notes`}</p></div><button type="button" onClick={markAll} disabled={Boolean(busy) || unread === 0} className="exchange-button-secondary py-2 disabled:opacity-50">{busy === "all" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}{zh ? "全部已讀" : "Mark all read"}</button></div>
      <div className="mt-5 grid gap-3">{items.length ? items.map((item) => {
        const copy = localizeNotification(item, locale);
        const href = notificationHref(item.href, locale);
        const date = new Date(item.createdAt);
        return <article key={item.id} className={`grid grid-cols-[auto_1fr_auto] gap-4 border p-4 ${item.readAt ? "border-[#2c2724]/12 bg-[#fffaf4]/65" : "border-[#c85d5a]/45 bg-[#fffaf4] shadow-[4px_4px_0_rgba(200,93,90,.14)]"}`}><span className={`mt-1 grid h-9 w-9 place-items-center ${item.readAt ? "bg-[#e8ded1] text-[#716862]" : "bg-[#c85d5a] text-white"}`}><Bell className="h-4 w-4" /></span><div className="min-w-0"><h3 className="text-sm font-black">{copy.title}</h3><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-[#716862]">{copy.body}</p>{Number.isFinite(date.getTime()) ? <time dateTime={item.createdAt} className="mt-2 block text-[9px] font-bold uppercase tracking-[.12em] text-[#9a9189]">{new Intl.DateTimeFormat(zh ? "zh-HK" : "en-HK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Hong_Kong" }).format(date)}</time> : null}{href ? <Link href={href} className="mt-3 inline-flex text-xs font-black text-[#9a4c4a]">{zh ? "打開內容" : "Open update"}</Link> : null}</div>{!item.readAt ? <button type="button" disabled={Boolean(busy)} onClick={() => markOne(item.id)} className="self-start text-[10px] font-black text-[#9a4c4a] disabled:opacity-50">{busy === item.id ? "…" : zh ? "已讀" : "Read"}</button> : null}</article>;
      }) : <div className="border border-dashed border-[#2c2724]/25 bg-[#fffaf4] p-8 text-center text-sm text-[#716862]">{zh ? "今天還沒有新便條。" : "No new notes have arrived today."}</div>}</div>
      {cursor ? <button type="button" onClick={loadNext} disabled={Boolean(busy)} className="exchange-button-secondary mt-5 disabled:opacity-50">{busy === "next" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{zh ? "讀取下一頁" : "Read next notes"}</button> : items.length ? <p className="mt-5 text-xs text-[#716862]">{zh ? "目前已讀取所有便條。" : "You have reached the end of your notes."}</p> : null}
      {status ? <p role="status" className="mt-4 text-sm text-[#9a4c4a]">{status}</p> : null}
    </section>
    <aside className="h-fit border border-[#2c2724] bg-[#283338] p-5 text-white xl:sticky xl:top-24"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#f2ca61]">{zh ? "通知偏好" : "NOTIFICATION SHELF"}</p><h2 className="mt-2 font-display text-3xl">{zh ? "想收到哪些消息？" : "What should return to you?"}</h2><div className="mt-5 grid gap-1">{labels.map(([key, en, cn]) => <label key={key} className="flex cursor-pointer items-center justify-between gap-4 border-b border-white/15 py-3 text-xs font-bold text-white/75"><span>{zh ? cn : en}</span><input type="checkbox" checked={preferences[key]} disabled={Boolean(busy)} onChange={() => changePreference(key)} className="h-4 w-4 accent-[#f2ca61] disabled:opacity-50" /></label>)}</div></aside>
  </div>;
}
