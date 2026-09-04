"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Bookmark, Eye, Flag, Heart, MessageCircle, NotebookTabs } from "lucide-react";
import { localePath, type PublicLocale } from "@/components/acg-locale";
import { PostConversation, type PostComment } from "@/components/post-conversation";
import { ShareButton } from "@/components/share-button";
import type { SocialNote } from "@/components/social-note-types";

function visualStyle(url: string | null, from = "#c85d5a", to = "#5f8f87") {
  return url ? { backgroundImage: `url(${JSON.stringify(url)})` } : { backgroundImage: `linear-gradient(145deg, ${from}, ${to})` };
}

export function SocialPostDetail({ note, comments, locale, signedIn, canModerate }: { note: SocialNote; comments: PostComment[]; locale: PublicLocale; signedIn: boolean; canModerate: boolean }) {
  const zh = locale === "zh-Hant";
  const [saved, setSaved] = useState(note.viewer.saved);
  const [saveCount, setSaveCount] = useState(note.counts.saves);
  const [status, setStatus] = useState("");

  async function toggleSave() {
    setStatus("");
    const response = await fetch(`/api/posts/${encodeURIComponent(note.id)}/save`, { method: saved ? "DELETE" : "POST" });
    if (response.ok) {
      setSaved((current) => !current);
      setSaveCount((current) => Math.max(0, current + (saved ? -1 : 1)));
      return;
    }
    setStatus(response.status === 401 ? (zh ? "登入後可以收藏到自己的書架。" : "Sign in to save this to your shelf.") : (zh ? "書架暫時沒有回應。" : "Your shelf did not respond yet."));
  }

  async function reportPost() {
    setStatus("");
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postId: note.id, reason: "Community safety review" }),
    });
    setStatus(response.ok ? (zh ? "已送到管理員的審核桌。" : "Sent to the moderation desk.") : response.status === 401 ? (zh ? "登入後可以送出檢舉。" : "Sign in to send a report.") : (zh ? "暫時未能送出檢舉。" : "The report could not be sent."));
  }

  return (
    <article className="post-detail-page">
      <Link href={localePath(locale, "/community")} className="post-back-link"><ArrowLeft />{zh ? "回到社群手帳" : "Back to the clubroom"}</Link>
      <header className="post-detail-header">
        <div className="post-detail-copy">
          <div className="post-detail-stamps"><span>{note.kind.replaceAll("_", " ")}</span>{note.topics.map((topic) => <span key={topic.slug}>#{topic.title}</span>)}</div>
          <h1>{note.title}</h1>
          <p>{note.body}</p>
          <div className="post-detail-byline"><span className="social-avatar">{note.author.displayName.charAt(0)}</span><div><strong>{note.author.displayName}</strong><small>@{note.author.handle}</small></div>{note.character ? <Link href={localePath(locale, `/character/${note.character.slug}`)}>{note.character.name}</Link> : null}</div>
          <div className="post-detail-actions"><button type="button" onClick={toggleSave} className={saved ? "is-saved" : ""}><Bookmark />{saved ? (zh ? "已收藏" : "Saved") : (zh ? "收藏" : "Save")} · {saveCount}</button><ShareButton title={note.title} text={note.body} path={localePath(locale, `/posts/${note.slug}`)} locale={locale} /><button type="button" onClick={reportPost}><Flag />{zh ? "檢舉" : "Report"}</button></div>
          {status ? <p className="post-action-status" role="status">{status}</p> : null}
        </div>
        <div className="post-detail-lead-visual" role="img" aria-label={note.media[0]?.altText ?? note.title} style={visualStyle(note.media[0]?.url ?? null, note.character?.accentFrom, note.character?.accentTo)}>{!note.media[0]?.url ? <strong>{note.character?.name.charAt(0) ?? "推"}</strong> : null}<span>{note.media[0]?.sourceLabel ?? (zh ? "社群筆記" : "Community note")}</span></div>
      </header>

      <div className="post-detail-ledger"><span><Heart />{note.counts.reactions}<small>{zh ? "心動" : "hearts"}</small></span><span><MessageCircle />{comments.length}<small>{zh ? "便條" : "notes"}</small></span><span><Eye />{note.viewCount}<small>{zh ? "翻閱" : "reads"}</small></span><span><NotebookTabs />{note.media.length}<small>{zh ? "頁素材" : "visuals"}</small></span></div>

      {note.media.length > 1 ? <section className="post-media-spread">{note.media.slice(1).map((media, index) => <figure key={media.id}><div role="img" aria-label={media.altText} style={visualStyle(media.url)} /><figcaption><b>0{index + 2}</b><span>{media.altText}</span>{media.sourceUrl ? <a href={media.sourceUrl} target="_blank" rel="noreferrer">{media.sourceLabel ?? (zh ? "查看來源" : "View source")}</a> : null}</figcaption></figure>)}</section> : null}
      {note.media[0]?.sourceUrl ? <p className="post-source-line">{zh ? "圖片來源" : "Visual source"}: <a href={note.media[0].sourceUrl} target="_blank" rel="noreferrer">{note.media[0].sourceLabel ?? note.media[0].sourceUrl}</a></p> : null}
      <PostConversation postId={note.id} initialComments={comments} locale={locale} signedIn={signedIn} canModerate={canModerate} />
    </article>
  );
}
