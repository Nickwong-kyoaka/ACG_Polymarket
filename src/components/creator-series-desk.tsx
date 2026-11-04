"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { localePath, type PublicLocale } from "@/components/acg-locale";
import type { listMyCreatorSeries } from "@/lib/creator-series";

type DeskData = Awaited<ReturnType<typeof listMyCreatorSeries>>;
const kinds = ["NOTE", "OUTFIT", "COMIC", "VOICE", "GUIDE", "PREDICTION_TAKE"];

export function CreatorSeriesDesk({ series, posts, locale }: DeskData & { locale: PublicLocale }) {
  const router = useRouter();
  const zh = locale === "zh-Hant";
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function save(key: string, path: string, method: "POST" | "PATCH", body: unknown) {
    setPending(key); setError(""); setMessage("");
    try {
      const response = await fetch(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not save series.");
      setMessage(zh ? "已儲存。" : "Series saved.");
      router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The connection failed."); }
    finally { setPending(""); }
  }

  function metadata(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = { title: String(form.get("title")), description: String(form.get("description")), kind: String(form.get("kind")), published: form.get("published") === "on" };
    void save(id ?? "new", id ? `/api/creator-series/${encodeURIComponent(id)}` : "/api/creator-series", id ? "PATCH" : "POST", data);
  }

  return <div className="grid gap-7">
    {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
    {message ? <p role="status" className="text-sm text-[#356e66]">{message}</p> : null}
    <section className="exchange-panel p-6">
      <h2 className="font-display text-3xl">{zh ? "開一本新連載" : "Start a new series"}</h2>
      <form className="mt-5 grid gap-4" onSubmit={(event) => metadata(event)}>
        <label className="text-xs font-bold">{zh ? "連載標題" : "Series title"}<input name="title" required minLength={3} maxLength={160} className="filter-field mt-2" /></label>
        <label className="text-xs font-bold">{zh ? "介紹" : "Description"}<textarea name="description" maxLength={3000} rows={3} className="filter-field mt-2" /></label>
        <label className="text-xs font-bold">{zh ? "類型" : "Kind"}<select name="kind" className="filter-field mt-2">{kinds.map((kind) => <option key={kind}>{kind}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" />{zh ? "公開連載頁面" : "Publish the series page"}</label>
        <p className="text-xs text-[#716862]">{zh ? "預設未公開。每一篇章仍需通過原有發布流程。" : "Private by default. Every chapter still follows the existing publication and review flow."}</p>
        <button disabled={Boolean(pending)} className="exchange-button-primary justify-self-start">{pending === "new" ? (zh ? "儲存中" : "Saving") : (zh ? "建立連載" : "Create series")}</button>
      </form>
    </section>
    {series.map((item) => <section key={`${item.id}:${item.updatedAt}`} className="exchange-panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-3xl">{item.title}</h2><span className="text-xs font-bold text-[#a34855]">{item.published ? (zh ? "已公開" : "Public") : (zh ? "未公開" : "Private")} / {item.subscriberCount} {zh ? "位訂閱者" : "subscribers"}</span></div>
      <form className="mt-5 grid gap-4" onSubmit={(event) => metadata(event, item.id)}>
        <label className="text-xs font-bold">{zh ? "標題" : "Title"}<input name="title" required minLength={3} maxLength={160} defaultValue={item.title} className="filter-field mt-2" /></label>
        <label className="text-xs font-bold">{zh ? "介紹" : "Description"}<textarea name="description" rows={3} maxLength={3000} defaultValue={item.description} className="filter-field mt-2" /></label>
        <label className="text-xs font-bold">{zh ? "類型" : "Kind"}<select name="kind" defaultValue={item.kind} className="filter-field mt-2">{kinds.map((kind) => <option key={kind}>{kind}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={item.published} />{zh ? "公開連載頁面" : "Publish the series page"}</label>
        <button disabled={Boolean(pending)} className="exchange-button-secondary justify-self-start">{zh ? "儲存設定" : "Save settings"}</button>
      </form>
      <details className="mt-5 border-t border-[#2c2724]/20 pt-4"><summary className="cursor-pointer text-sm font-bold">{zh ? "整理篇章" : "Organize chapters"} ({item.postIds.length})</summary>
        <form className="mt-4 grid gap-3" onSubmit={(event) => {
          event.preventDefault(); const postIds = new FormData(event.currentTarget).getAll("postIds").map(String);
          void save(`posts-${item.id}`, `/api/creator-series/${encodeURIComponent(item.id)}`, "PATCH", { postIds });
        }}>
          <label className="text-xs font-bold">{zh ? "選擇篇章（最多 100 篇）" : "Select chapters (up to 100)"}<select name="postIds" multiple size={Math.min(8, Math.max(posts.length, 2))} defaultValue={item.postIds} className="filter-field mt-2">{posts.map((post) => <option key={post.id} value={post.id}>{post.title} / {post.status}{post.creatorSeriesId && post.creatorSeriesId !== item.id ? (zh ? " / 從其他連載移入" : " / moves from another series") : ""}</option>)}</select></label>
          <p className="text-xs leading-6 text-[#716862]">{zh ? "按住 Ctrl 或 Command 選取多篇；未選取的篇章會移出本連載。這不會更改篇章審核狀態。" : "Hold Ctrl or Command to select multiple chapters. Unselected chapters leave this series; review status is never changed."}</p>
          <button disabled={Boolean(pending)} className="exchange-button-secondary justify-self-start">{zh ? "儲存篇章選擇" : "Save chapter selection"}</button>
        </form>
      </details>
      <div className="mt-5 flex flex-wrap gap-3">{item.published ? <Link className="exchange-button-secondary" href={localePath(locale, `/creators/series/${item.slug}`)}>{zh ? "公開連載頁" : "Public series page"}</Link> : null}<Link className="exchange-button-secondary" href={`${localePath(locale, "/create")}?creatorSeriesId=${encodeURIComponent(item.id)}`}>{zh ? "寫新篇章" : "Write a chapter"}</Link></div>
    </section>)}
  </div>;
}
