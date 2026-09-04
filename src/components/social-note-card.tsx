"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, Eye, Heart, MessageCircle, Sparkle } from "lucide-react";
import { localePath, type PublicLocale } from "@/components/acg-locale";
import { ShareButton } from "@/components/share-button";
import type { SocialNote } from "@/components/social-note-types";

function coverStyle(note: SocialNote) {
  const image = note.media[0]?.url;
  return image
    ? { backgroundImage: `url(${JSON.stringify(image)})` }
    : { backgroundImage: `linear-gradient(145deg, ${note.character?.accentFrom ?? "#c85d5a"}, ${note.character?.accentTo ?? "#5f8f87"})` };
}

export function SocialNoteCard({ note, locale, priority = false }: { note: SocialNote; locale: PublicLocale; priority?: boolean }) {
  const zh = locale === "zh-Hant";
  const [saved, setSaved] = useState(note.viewer.saved);
  const [saveCount, setSaveCount] = useState(note.counts.saves);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const postPath = note.href ? localePath(locale, note.href) : localePath(locale, `/posts/${note.slug}`);
  const initials = note.author.displayName.trim().charAt(0).toUpperCase() || "A";

  async function toggleSave() {
    setPending(true);
    setStatus("");
    const response = await fetch(`/api/posts/${encodeURIComponent(note.id)}/save`, { method: saved ? "DELETE" : "POST" });
    if (response.ok) {
      setSaved((current) => !current);
      setSaveCount((current) => Math.max(0, current + (saved ? -1 : 1)));
    } else if (response.status === 401) {
      setStatus(zh ? "登入後可收藏到自己的書架。" : "Sign in to save this to your shelf.");
    } else {
      setStatus(zh ? "暫時未能收藏。" : "This note could not be saved yet.");
    }
    setPending(false);
  }

  return (
    <article className={priority ? "social-note-card is-featured" : "social-note-card"}>
      <Link href={postPath} className="social-note-cover" aria-label={note.title}>
        <span role="img" aria-label={note.media[0]?.altText ?? note.title} style={coverStyle(note)} />
        {!note.media[0]?.url ? <b aria-hidden="true">{note.character?.name.charAt(0) ?? "推"}</b> : null}
        <div className="social-note-cover-labels">
          <small>{note.kind.replaceAll("_", " ")}</small>
          {note.media[0]?.sourceLabel ? <small>{note.media[0].sourceLabel}</small> : null}
        </div>
      </Link>
      <div className="social-note-copy">
        {note.recommendationReason ? <p className="social-reason"><Sparkle />{note.recommendationReason}</p> : null}
        <Link href={postPath}><h2>{note.title}</h2></Link>
        <p className="social-note-excerpt">{note.body}</p>
        <div className="social-note-topics">{note.topics.slice(0, 3).map((topic) => <span key={topic.slug}>#{topic.title}</span>)}</div>
        <div className="social-note-author">
          <span className="social-avatar">{note.author.imageUrl ? <i style={{ backgroundImage: `url(${JSON.stringify(note.author.imageUrl)})` }} /> : initials}</span>
          <span><strong>{note.author.displayName}</strong><small>@{note.author.handle}</small></span>
          {note.character ? <Link href={localePath(locale, `/character/${note.character.slug}`)}>{note.character.name}</Link> : null}
        </div>
        <div className="social-note-actions">
          <span className="social-action"><Heart />{note.counts.reactions}</span>
          <Link href={`${postPath}#conversation`} className="social-action"><MessageCircle />{note.counts.comments}</Link>
          <button type="button" className={saved ? "social-action is-saved" : "social-action"} onClick={toggleSave} disabled={pending} aria-pressed={saved}><Bookmark />{saveCount}</button>
          {note.viewCount > 0 ? <span className="social-action"><Eye />{note.viewCount}</span> : null}
          <ShareButton title={note.title} text={note.body} path={postPath} locale={locale} compact />
        </div>
        {status ? <p className="social-card-status" role="status">{status}</p> : null}
      </div>
    </article>
  );
}
