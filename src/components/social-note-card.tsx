"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Bookmark, Eye, Heart, MessageCircle, Sparkle } from "lucide-react";
import { localePath, type PublicLocale } from "@/components/acg-locale";
import { ShareButton } from "@/components/share-button";
import { FollowButton } from "@/components/follow-button";
import { SocialNoteImage } from "@/components/social-note-image";
import { socialNoteKind, type SocialFeedTab, type SocialNote } from "@/components/social-note-types";

export function SocialNoteCard({ note, locale, feed, feedFrom = "community" }: { note: SocialNote; locale: PublicLocale; priority?: boolean; feed?: SocialFeedTab; feedFrom?: "home" | "community" }) {
  const zh = locale === "zh-Hant";
  const [saved, setSaved] = useState(note.viewer.saved);
  const [saveCount, setSaveCount] = useState(note.counts.saves);
  const [pending, setPending] = useState(false);
  const acting = useRef(false);
  const [status, setStatus] = useState("");
  const [liked, setLiked] = useState(note.viewer.reactions?.includes("LIKE") ?? false);
  const [reactionCount, setReactionCount] = useState(note.counts.reactions);
  const isPost = !note.href;
  const postPath = note.href ? localePath(locale, note.href) : localePath(locale, `/posts/${note.slug}`);
  const navigationPath = feed && isPost ? `${postPath}?feed=${feed}&feedFrom=${feedFrom}` : postPath;
  const initials = note.author.displayName.trim().charAt(0).toUpperCase() || "A";

  async function toggleSave() {
    if (acting.current) return;
    acting.current = true;
    setPending(true);
    setStatus("");
    try {
    const response = await fetch(`/api/posts/${encodeURIComponent(note.id)}/save`, { method: saved ? "DELETE" : "POST" });
    if (response.ok) {
      setSaved((current) => !current);
      setSaveCount((current) => Math.max(0, current + (saved ? -1 : 1)));
    } else if (response.status === 401) {
      setStatus(zh ? "登入後即可收藏筆記。" : "Sign in to save this note.");
    } else {
      setStatus(zh ? "暫時未能收藏。" : "This note could not be saved yet.");
    }
    } catch { setStatus(zh ? "連線中斷，請再試一次。" : "Connection lost. Please try again."); }
    finally { acting.current = false; setPending(false); }
  }

  async function toggleLike() {
    if (acting.current) return;
    acting.current = true;
    setPending(true); setStatus("");
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(note.id)}/reactions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "LIKE" }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus(response.status === 401 ? (zh ? "登入後即可按讚。" : "Sign in to leave a like.") : (zh ? "未能按讚，請重試。" : "Could not send your like. Please retry."));
        return;
      }
      if (typeof payload?.reacted !== "boolean" || !Number.isFinite(payload.reactionCount)) throw new Error("invalid response");
      setLiked(payload.reacted); setReactionCount(payload.reactionCount);
    } catch { setStatus(zh ? "未能按讚，請檢查連線後重試。" : "Could not send your like. Check your connection and retry."); }
    finally { acting.current = false; setPending(false); }
  }

  return (
    <article className="social-note-card social-note-candidate [&_button]:min-h-11 [&_button]:min-w-11 [&_a]:min-h-11" data-feed-note={note.id}>
      <Link href={navigationPath} prefetch={false} className="social-note-cover" aria-label={note.title}>
        <SocialNoteImage url={note.media[0]?.url} alt={note.media[0]?.altText ?? note.title} locale={locale} className="aspect-[4/5]" />
        <div className="social-note-cover-labels">
          <small>{socialNoteKind(note.kind, locale)}</small>
          {note.media[0]?.sourceLabel ? <small>{note.media[0].sourceLabel}</small> : null}
        </div>
      </Link>
      <div className="social-note-copy">
        {note.recommendationReason ? <p className="social-reason"><Sparkle />{note.recommendationReason}</p> : null}
        <Link href={navigationPath} prefetch={false}><h2 className="social-note-title-candidate">{note.title}</h2></Link>
        <p className="social-note-excerpt">{note.body}</p>
        <div className="social-note-topics">{note.topics.slice(0, 3).map((topic) => <span key={topic.slug}>#{topic.title} {topic.id ? <FollowButton targetType="topic" targetId={topic.id} locale={locale} /> : null}</span>)}</div>
        <div className="social-note-author">
          <span className="social-avatar">{note.author.imageUrl ? <i style={{ backgroundImage: `url(${JSON.stringify(note.author.imageUrl)})` }} /> : initials}</span>
          <span><strong style={{ fontSize: "0.875rem" }}>{note.author.displayName}</strong><small style={{ fontSize: "0.8125rem" }}>@{note.author.handle}</small></span>
          {isPost ? <FollowButton targetType="user" targetId={note.author.id} initialFollowing={note.viewer.followingAuthor} locale={locale} /> : null}
          {note.character ? <Link href={localePath(locale, `/character/${note.character.slug}`)}>{note.character.name}</Link> : null}
        </div>
        <div className="social-note-actions">
          {isPost ? <button type="button" className="social-action" aria-label={zh ? `喜歡 · ${reactionCount}` : `Like · ${reactionCount}`} onClick={toggleLike} aria-pressed={liked} disabled={pending}><Heart fill={liked ? "currentColor" : "none"} />{reactionCount}</button> : <span className="social-action"><Heart />{reactionCount}</span>}
          <Link href={`${navigationPath}#conversation`} className="social-action" aria-label={zh ? `留言 · ${note.counts.comments}` : `Comments · ${note.counts.comments}`}><MessageCircle />{note.counts.comments}</Link>
          {isPost ? <button type="button" className={saved ? "social-action is-saved" : "social-action"} aria-label={zh ? `收藏 · ${saveCount}` : `Save · ${saveCount}`} onClick={toggleSave} disabled={pending} aria-pressed={saved}><Bookmark />{saveCount}</button> : <Link className="social-action" href={postPath}><Bookmark />{zh ? "角色頁" : "Character"}</Link>}
          {note.viewCount > 0 ? <span className="social-action"><Eye />{note.viewCount}</span> : null}
          <ShareButton title={note.title} text={note.body} path={postPath} locale={locale} compact />
        </div>
        {status ? <p className="social-card-status" role="status">{status}</p> : null}
      </div>
    </article>
  );
}
