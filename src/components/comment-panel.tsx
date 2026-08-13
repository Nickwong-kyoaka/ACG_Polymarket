"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Flag, Heart, MessageCircleHeart, Sparkles } from "lucide-react";
import { formatHongKongDate, getExchangeCopy, pick, type PublicLocale } from "@/components/acg-locale";

type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  author?: { displayName: string; handle: string };
};

export function CommentPanel({ characterId, comments, reactions, locale = "en" }: { characterId: string; comments: CommentItem[]; reactions: Record<string, number>; locale?: PublicLocale }) {
  const router = useRouter();
  const copy = getExchangeCopy(locale);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function addComment() {
    const response = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, content }) });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error ?? copy.comments.failed);
      return;
    }
    setContent("");
    setStatus(copy.comments.posted);
    startTransition(() => router.refresh());
  }

  async function react(kind: "CHEER" | "HEART" | "HYPE") {
    const response = await fetch("/api/reactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, kind }) });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error ?? copy.comments.reactFailed);
      return;
    }
    const label = kind === "CHEER" ? copy.comments.cheer : kind === "HEART" ? copy.comments.heart : copy.comments.hype;
    setStatus(`${label} +1`);
    startTransition(() => router.refresh());
  }

  async function report(commentId: string) {
    const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, commentId, reason: "Community safety review" }) });
    const payload = await response.json();
    setStatus(response.ok ? pick(locale, "Report sent for a quiet review.", "檢舉已送交審核，不會公開顯示。") : payload.error ?? copy.comments.failed);
  }

  const reactionOptions = [
    { kind: "CHEER" as const, icon: Sparkles, label: copy.comments.cheer },
    { kind: "HEART" as const, icon: Heart, label: copy.comments.heart },
    { kind: "HYPE" as const, icon: MessageCircleHeart, label: copy.comments.hype },
  ];

  return (
    <div className="exchange-panel grid gap-5 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap gap-3">
        {reactionOptions.map(({ kind, icon: Icon, label }) => (
          <button key={kind} type="button" onClick={() => react(kind)} className="exchange-button-secondary py-2">
            <Icon className="h-4 w-4 text-[#e83c62]" />{label} · {reactions[kind] ?? 0}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        <textarea rows={4} value={content} onChange={(event) => setContent(event.target.value)} placeholder={copy.comments.placeholder} className="filter-field min-h-28 resize-y" />
        <button type="button" disabled={pending || content.trim().length < 3} onClick={addComment} className="exchange-button-primary justify-self-start disabled:opacity-50">{copy.comments.post}</button>
        {status ? <p className="text-sm font-medium text-slate-600">{status}</p> : null}
      </div>

      <div className="grid gap-3">
        {comments.map((comment) => (
          <article key={comment.id} className="rounded-[18px_5px_18px_5px] border border-black/10 bg-[#f8f6ef] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-950">{comment.author?.displayName ?? copy.comments.supporter}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">@{comment.author?.handle ?? copy.comments.guest}</p>
              </div>
              <div className="flex items-center gap-3">
                <time className="text-[10px] uppercase tracking-[0.12em] text-slate-400" dateTime={comment.createdAt}>{formatHongKongDate(comment.createdAt, locale)}</time>
                <button type="button" onClick={() => report(comment.id)} aria-label="Report comment" className="text-slate-300 transition hover:text-[#e83c62]"><Flag className="h-4 w-4" /></button>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">{comment.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
