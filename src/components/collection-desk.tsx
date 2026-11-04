"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { localePath, type PublicLocale } from "@/components/acg-locale";

interface ShelfItem { id: string; type: "post" | "character" | "asset"; note: string | null; post?: { id: string; title: string }; character?: { id: string; name: string }; asset?: { id: string; altText: string } }
interface Shelf { id: string; slug: string; title: string; description: string; isPublic: boolean; previewItems: ShelfItem[] }

export function CollectionDesk({ collections, savedPosts, locale }: { collections: Shelf[]; savedPosts: Array<{ id: string; title: string }>; locale: PublicLocale }) {
  const router = useRouter();
  const zh = locale === "zh-Hant";
  const [editing, setEditing] = useState<Shelf | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setPublic] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const availablePosts = [...new Map([...savedPosts, ...(editing?.previewItems.flatMap((item) => item.post ? [item.post] : []) ?? [])].map((post) => [post.id, post])).values()];
  function edit(shelf: Shelf) { setEditing(shelf); setTitle(shelf.title); setDescription(shelf.description); setPublic(shelf.isPublic); setSelectedPosts(shelf.previewItems.flatMap((item) => item.post ? [item.post.id] : [])); }
  async function save() {
    if (busy) return;
    setBusy(true); setMessage("");
    const retained = editing?.previewItems.filter((item) => item.type !== "post").map((item) => ({ ...(item.character ? { characterId: item.character.id } : {}), ...(item.asset ? { assetId: item.asset.id } : {}), note: item.note ?? undefined })) ?? [];
    try {
      const response = await fetch(editing ? `/api/collections/${editing.id}` : "/api/collections", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, description, isPublic, items: [...retained, ...selectedPosts.map((postId) => ({ postId }))] }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error);
      setEditing(null); setTitle(""); setDescription(""); setSelectedPosts([]); setMessage(zh ? "收藏櫃已整理好。" : "Your shelf is saved."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : (zh ? "暫時無法儲存。" : "Could not save.")); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm(zh ? "刪除這個收藏櫃？筆記本身會保留。" : "Delete this shelf? The notes will remain.")) return;
    setBusy(true);
    try { const response = await fetch(`/api/collections/${id}`, { method: "DELETE" }); if (!response.ok) throw new Error(); router.refresh(); }
    catch { setMessage(zh ? "未能刪除，請再試一次。" : "Could not delete. Try again."); } finally { setBusy(false); }
  }
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="exchange-panel p-6">
        <h2 className="font-display text-3xl">{editing ? (zh ? "整理收藏櫃" : "Edit shelf") : (zh ? "新建收藏櫃" : "Start a shelf")}</h2>
        <form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <label>{zh ? "名稱" : "Title"}<input required maxLength={80} className="filter-field mt-2" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>{zh ? "介紹" : "Description"}<textarea className="filter-field mt-2" maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={isPublic} onChange={(event) => setPublic(event.target.checked)} />{zh ? "公開這個收藏櫃" : "Make this shelf public"}</label>
          <fieldset className="grid max-h-72 gap-2 overflow-auto">
            <legend>{zh ? "收進已收藏的筆記" : "Add saved notes"}</legend>
            {availablePosts.map((post) => <label key={post.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={selectedPosts.includes(post.id)} onChange={(event) => setSelectedPosts((current) => event.target.checked ? [...current, post.id] : current.filter((id) => id !== post.id))} />{post.title}</label>)}
          </fieldset>
          <button disabled={busy} className="exchange-button-primary">{zh ? "儲存收藏櫃" : "Save shelf"}</button>
          {editing ? <button type="button" onClick={() => { setEditing(null); setTitle(""); setDescription(""); setSelectedPosts([]); }}>{zh ? "取消編輯" : "Cancel edit"}</button> : null}
          {message ? <p role="status">{message}</p> : null}
        </form>
      </div>
      <div className="grid content-start gap-4">
        {collections.map((shelf) => (
          <article key={shelf.id} className="exchange-panel p-6">
            <p className="text-xs text-[#a34855]">{shelf.isPublic ? (zh ? "公開" : "Public") : (zh ? "私人" : "Private")}</p>
            <h3 className="mt-2 font-display text-3xl">{shelf.title}</h3>
            <p className="my-3 text-sm text-slate-600">{shelf.description}</p>
            <ul className="grid gap-2 text-sm">{shelf.previewItems.map((item) => <li key={item.id}>{item.post?.title ?? item.character?.name ?? item.asset?.altText}</li>)}</ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <button disabled={busy} className="exchange-button-secondary" onClick={() => edit(shelf)}>{zh ? "整理" : "Edit"}</button>
              {shelf.isPublic ? <Link className="exchange-button-secondary" href={localePath(locale, `/collections/${shelf.slug}`)}>{zh ? "查看公開頁" : "View public shelf"}</Link> : null}
              <button disabled={busy} onClick={() => void remove(shelf.id)}>{zh ? "刪除" : "Delete"}</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
