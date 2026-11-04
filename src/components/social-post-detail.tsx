"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { ArrowLeft, Bookmark, Eye, Flag, Heart, MessageCircle, NotebookTabs } from "lucide-react";
import { localePath, type PublicLocale } from "@/components/acg-locale";
import { PostConversation, type PostComment } from "@/components/post-conversation";
import { ShareButton } from "@/components/share-button";
import { socialNoteKind, type SocialNote } from "@/components/social-note-types";
import { feedTab } from "@/components/social-feed-session";
import { SocialNoteImage } from "@/components/social-note-image";

function FeedBackLink({ locale }: { locale: PublicLocale }) {
  const params = useSearchParams();
  const tab = feedTab(params.get("feed"));
  const path = params.get("feedFrom") === "home" ? "/" : "/community";
  return <Link href={`${localePath(locale, path)}?feed=${tab}`} scroll={false} className="post-back-link min-h-11"><ArrowLeft />{locale === "zh-Hant" ? "返回內容流" : "Back to feed"}</Link>;
}

export function SocialPostDetail({ note, comments, locale, signedIn, canModerate }: { note: SocialNote; comments: PostComment[]; locale: PublicLocale; signedIn: boolean; canModerate: boolean }) {
  const zh = locale === "zh-Hant";
  const [saved, setSaved] = useState(note.viewer.saved);
  const [saveCount, setSaveCount] = useState(note.counts.saves);
  const [status, setStatus] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Unsafe or harmful content");
  const [reportDetail, setReportDetail] = useState("");
  const [reportPending, setReportPending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const saving = useRef(false);

  async function toggleSave() {
    if (saving.current) return;
    saving.current = true;
    setSavePending(true);
    setStatus("");
    try {
    const response = await fetch(`/api/posts/${encodeURIComponent(note.id)}/save`, { method: saved ? "DELETE" : "POST" });
    if (response.ok) {
      setSaved((current) => !current);
      setSaveCount((current) => Math.max(0, current + (saved ? -1 : 1)));
      return;
    }
    setStatus(response.status === 401 ? (zh ? "登入後即可收藏筆記。" : "Sign in to save this note.") : (zh ? "收藏失敗，請重試。" : "Could not save this note. Please retry."));
    } catch { setStatus(zh ? "連線中斷，請重試。" : "Connection lost. Please retry."); }
    finally { saving.current = false; setSavePending(false); }
  }

  async function reportPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setReportPending(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId: note.id, reason: reportReason, detail: reportDetail.trim() || undefined }),
      });
      setStatus(response.ok ? (zh ? "已送出檢舉，等待管理員審核。" : "Report sent for moderation.") : response.status === 401 ? (zh ? "登入後可以送出檢舉。" : "Sign in to send a report.") : (zh ? "暫時未能送出檢舉。" : "The report could not be sent."));
      if (response.ok) { setReportOpen(false); setReportDetail(""); }
    } catch { setStatus(zh ? "暫時未能送出檢舉。" : "The report could not be sent. Please retry."); }
    finally { setReportPending(false); }
  }

  return (
    <article className="post-detail-page social-detail-candidate [&_button]:min-h-11 [&_button]:min-w-11 [&_a]:min-h-11">
      <Suspense fallback={<Link href={`${localePath(locale, "/community")}?feed=for-you`} className="post-back-link">{zh ? "返回內容流" : "Back to feed"}</Link>}><FeedBackLink locale={locale} /></Suspense>
      <header className="post-detail-header">
        <div className="post-detail-copy">
          <div className="post-detail-stamps"><span>{socialNoteKind(note.kind, locale)}</span>{note.topics.map((topic) => <span key={topic.slug}>#{topic.title}</span>)}</div>
          <h1>{note.title}</h1>
          <p>{note.body}</p>
          <div className="post-detail-byline"><span className="social-avatar">{note.author.displayName.charAt(0)}</span><div><strong>{note.author.displayName}</strong><small>@{note.author.handle}</small></div>{note.character ? <Link href={localePath(locale, `/character/${note.character.slug}`)}>{note.character.name}</Link> : null}</div>
          <div className="post-detail-actions"><button type="button" onClick={toggleSave} disabled={savePending} aria-pressed={saved} className={saved ? "is-saved" : ""}><Bookmark />{saved ? (zh ? "已收藏" : "Saved") : (zh ? "收藏" : "Save")} · {saveCount}</button><ShareButton title={note.title} text={note.body} path={localePath(locale, `/posts/${note.slug}`)} locale={locale} /><button type="button" onClick={() => setReportOpen((open) => !open)} aria-expanded={reportOpen}><Flag />{zh ? "檢舉" : "Report"}</button></div>
          {reportOpen ? <form onSubmit={reportPost} className="mt-4 grid gap-3 rounded-xl border border-slate-300 p-4"><label className="grid gap-1">{zh ? "檢舉原因" : "Report reason"}<select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="rounded border p-2"><option value="Unsafe or harmful content">{zh ? "有害或不安全內容" : "Unsafe or harmful content"}</option><option value="Harassment or hate">{zh ? "騷擾或仇恨" : "Harassment or hate"}</option><option value="Copyright or image rights">{zh ? "版權或圖片權利" : "Copyright or image rights"}</option><option value="Spam or misleading content">{zh ? "垃圾或誤導內容" : "Spam or misleading content"}</option></select></label><label className="grid gap-1">{zh ? "補充說明（選填）" : "Additional detail (optional)"}<textarea value={reportDetail} onChange={(event) => setReportDetail(event.target.value)} maxLength={500} className="rounded border p-2" /></label><button type="submit" disabled={reportPending} className="rounded border px-3 py-2 disabled:opacity-50">{reportPending ? (zh ? "傳送中" : "Sending...") : (zh ? "送出檢舉" : "Send report")}</button></form> : null}
          {status ? <p className="post-action-status" role="status">{status}</p> : null}
        </div>
        <div className="post-detail-lead-visual"><SocialNoteImage url={note.media[0]?.url} alt={note.media[0]?.altText ?? note.title} locale={locale} priority className="absolute inset-0 h-full w-full" /><small>{note.media[0]?.sourceLabel ?? (zh ? "社群筆記" : "Community note")}</small></div>
      </header>

      <div className="post-detail-ledger"><span><Heart />{note.counts.reactions}<small>{zh ? "心動" : "hearts"}</small></span><span><MessageCircle />{comments.length}<small>{zh ? "便條" : "notes"}</small></span><span><Eye />{note.viewCount}<small>{zh ? "翻閱" : "reads"}</small></span><span><NotebookTabs />{note.media.length}<small>{zh ? "頁素材" : "visuals"}</small></span></div>

      {note.media.length > 1 ? <section className="post-media-spread">{note.media.slice(1).map((media, index) => <figure key={media.id}><SocialNoteImage url={media.url} alt={media.altText} locale={locale} className="aspect-[4/5]" /><figcaption><b>0{index + 2}</b><span>{media.altText}</span>{media.sourceUrl ? <a href={media.sourceUrl} target="_blank" rel="noreferrer">{media.sourceLabel ?? (zh ? "查看來源" : "View source")}</a> : null}</figcaption></figure>)}</section> : null}
      {note.media[0]?.sourceUrl ? <p className="post-source-line">{zh ? "圖片來源" : "Visual source"}: <a href={note.media[0].sourceUrl} target="_blank" rel="noreferrer">{note.media[0].sourceLabel ?? note.media[0].sourceUrl}</a></p> : null}
      <PostConversation postId={note.id} initialComments={comments} locale={locale} signedIn={signedIn} canModerate={canModerate} />
    </article>
  );
}
