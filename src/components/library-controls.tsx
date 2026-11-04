"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicLocale } from "@/components/acg-locale";

export function LibraryControls({ seriesId, initialStatus, initialRating, initialPrivate = true, episodes, locale }: { seriesId: string; initialStatus: string | null; initialRating: number | null; initialPrivate?: boolean; episodes: Array<{ id: string; title: string; watched: boolean }>; locale: PublicLocale }) {
  const router = useRouter();
  const zh = locale === "zh-Hant";
  const [status, setStatus] = useState(initialStatus ?? "WANT");
  const [rating, setRating] = useState(initialRating?.toString() ?? "");
  const [privateEntry, setPrivate] = useState(initialPrivate);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const labels = zh ? ["想看", "在看", "看完", "擱置", "棄番"] : ["Want to watch", "Watching", "Completed", "On hold", "Dropped"];
  async function put(url: string, data: unknown) {
    if (busy) return;
    setBusy(true); setMessage("");
    try { const response = await fetch(url, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }); const payload = await response.json(); if (!response.ok) throw new Error(response.status === 401 ? (zh ? "登入後就能整理追番記錄。" : "Sign in to track your series.") : payload.error); setMessage(zh ? "已記下。" : "Saved."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : (zh ? "暫時未能儲存。" : "Could not save.")); } finally { setBusy(false); }
  }
  return <section className="exchange-panel grid gap-5 p-6"><h2 className="font-display text-3xl">{zh ? "我的追番記錄" : "My watch journal"}</h2><form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void put(`/api/me/library/${seriesId}`, { status, private: privateEntry, rating: rating ? { score: Number(rating), private: privateEntry } : null }); }}><label>{zh ? "進度" : "Status"}<select className="filter-field mt-2" value={status} onChange={(event) => setStatus(event.target.value)}>{["WANT", "WATCHING", "COMPLETED", "ON_HOLD", "DROPPED"].map((value, index) => <option key={value} value={value}>{labels[index]}</option>)}</select></label><label>{zh ? "評分" : "Rating"}<select className="filter-field mt-2" value={rating} onChange={(event) => setRating(event.target.value)}><option value="">{zh ? "暫不評分" : "Not rated"}</option>{Array.from({ length: 10 }, (_, index) => <option key={index} value={index + 1}>{index + 1} / 10</option>)}</select></label><label className="flex items-center gap-2"><input checked={privateEntry} onChange={(event) => setPrivate(event.target.checked)} type="checkbox" />{zh ? "記錄僅自己可見" : "Keep my entry private"}</label><button disabled={busy} className="exchange-button-primary">{zh ? "儲存記錄" : "Save journal"}</button></form><div className="grid gap-2">{episodes.map((episode) => <label key={episode.id} className="flex items-center gap-3 border-t border-black/10 py-3"><input disabled={busy} type="checkbox" checked={episode.watched} onChange={(event) => void put(`/api/me/episodes/${episode.id}`, { status: event.target.checked ? "WATCHED" : "PLANNED" })} /><span>{episode.title}</span><small className="ml-auto">{episode.watched ? (zh ? "已看" : "Watched") : (zh ? "未看" : "Not yet")}</small></label>)}</div>{message ? <p role="status" className="text-sm text-[#a34855]">{message}</p> : null}</section>;
}
