"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { localePath, type PublicLocale } from "@/components/acg-locale";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

interface Preferences {
  followedContent: boolean;
  seriesUpdates: boolean;
  predictionChanges: boolean;
  predictionClosing: boolean;
  resolutions: boolean;
  moderationResults: boolean;
}

export function NotificationCenter({ initialItems, initialPreferences, locale }: { initialItems: NotificationItem[]; initialPreferences: Preferences; locale: PublicLocale }) {
  const zh = locale === "zh-Hant";
  const [items, setItems] = useState(initialItems);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");

  async function patch(body: unknown) {
    const response = await fetch("/api/me/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error();
  }

  async function markOne(id: string) {
    setBusy(id);
    try {
      await patch({ action: "MARK_READ", id });
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
    } catch { setStatus(zh ? "暫時未能更新。" : "Could not update just yet."); }
    setBusy("");
  }

  async function markAll() {
    setBusy("all");
    try {
      await patch({ action: "MARK_ALL_READ" });
      const time = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? time })));
    } catch { setStatus(zh ? "暫時未能全部標記。" : "Could not mark everything yet."); }
    setBusy("");
  }

  async function changePreference(key: keyof Preferences) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    try {
      await patch({ action: "PREFERENCES", preferences: { [key]: next[key] } });
      setStatus(zh ? "通知偏好已保存。" : "Notification preference saved.");
    } catch {
      setPreferences(preferences);
      setStatus(zh ? "偏好暫時未保存。" : "Preference did not save yet.");
    }
  }

  const preferenceLabels: Array<[keyof Preferences, string, string]> = [
    ["followedContent", "Followed creators and characters", "關注的創作者與角色"],
    ["seriesUpdates", "Series and episode updates", "作品與集數更新"],
    ["predictionChanges", "Prediction probability signals", "預測機率訊號"],
    ["predictionClosing", "Prediction closing reminders", "預測截止提醒"],
    ["resolutions", "Resolution results", "預測結算結果"],
    ["moderationResults", "Post and revision reviews", "投稿與修訂審核"],
  ];

  function localTitle(item: NotificationItem) {
    if (!zh) return item.title;
    const known: Record<string, string> = { "Prediction added": "已加入預測", "Prediction reduced": "已減少預測持有", "Support trade completed": "應援紀錄已更新" };
    return known[item.title] ?? item.title;
  }

  return <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
    <section>
      <div className="flex items-center justify-between gap-4 border-b border-[#2c2724] pb-4"><div><p className="exchange-kicker">INBOX</p><h2 className="mt-2 font-display text-3xl">{zh ? "最近回到房間的消息" : "Messages that reached your room"}</h2></div><button type="button" onClick={markAll} disabled={Boolean(busy)} className="exchange-button-secondary py-2">{busy === "all" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}{zh ? "全部已讀" : "Mark all read"}</button></div>
      <div className="mt-5 grid gap-3">{items.length ? items.map((item) => <article key={item.id} className={`grid grid-cols-[auto_1fr_auto] gap-4 border p-4 ${item.readAt ? "border-[#2c2724]/12 bg-[#fffaf4]/65" : "border-[#c85d5a]/45 bg-[#fffaf4] shadow-[4px_4px_0_rgba(200,93,90,.14)]"}`}><span className={`mt-1 grid h-9 w-9 place-items-center ${item.readAt ? "bg-[#e8ded1] text-[#716862]" : "bg-[#c85d5a] text-white"}`}><Bell className="h-4 w-4" /></span><div><p className="text-sm font-black">{localTitle(item)}</p><p className="mt-1 text-xs leading-6 text-[#716862]">{item.body}</p><time className="mt-2 block text-[9px] font-bold uppercase tracking-[.12em] text-[#9a9189]">{new Intl.DateTimeFormat(zh ? "zh-HK" : "en-HK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Hong_Kong" }).format(new Date(item.createdAt))}</time>{item.href ? <Link href={item.href.startsWith(`/${locale}`) ? item.href : localePath(locale, item.href)} className="mt-3 inline-flex text-xs font-black text-[#9a4c4a]">{zh ? "打開內容" : "Open update"}</Link> : null}</div>{!item.readAt ? <button type="button" disabled={busy === item.id} onClick={() => markOne(item.id)} className="self-start text-[10px] font-black text-[#9a4c4a]">{busy === item.id ? "…" : (zh ? "已讀" : "Read")}</button> : null}</article>) : <div className="border border-dashed border-[#2c2724]/25 bg-[#fffaf4] p-8 text-center text-sm text-[#716862]">{zh ? "今天還沒有新便條。" : "No new notes have arrived today."}</div>}</div>
    </section>
    <aside className="h-fit border border-[#2c2724] bg-[#283338] p-5 text-white xl:sticky xl:top-24"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#f2ca61]">NOTIFICATION SHELF</p><h2 className="mt-2 font-display text-3xl">{zh ? "想收到哪些消息？" : "What should return to you?"}</h2><div className="mt-5 grid gap-1">{preferenceLabels.map(([key, en, cn]) => <label key={key} className="flex cursor-pointer items-center justify-between gap-4 border-b border-white/15 py-3 text-xs font-bold text-white/75"><span>{zh ? cn : en}</span><input type="checkbox" checked={preferences[key]} onChange={() => changePreference(key)} className="h-4 w-4 accent-[#f2ca61]" /></label>)}</div>{status ? <p role="status" className="mt-4 text-xs text-[#f2ca61]">{status}</p> : null}</aside>
  </div>;
}
