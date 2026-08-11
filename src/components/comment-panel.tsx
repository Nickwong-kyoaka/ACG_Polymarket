"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { REACTION_LABELS } from "@/lib/constants";
import { getCopy, type Locale } from "@/lib/i18n";
import { formatRelativeDate } from "@/lib/time";

type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  author?: {
    displayName: string;
    handle: string;
  };
};

export function CommentPanel({
  characterId,
  comments,
  reactions,
  locale = "en",
}: {
  characterId: string;
  comments: CommentItem[];
  reactions: Record<string, number>;
  locale?: Locale;
}) {
  const router = useRouter();
  const copy = getCopy(locale);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function addComment() {
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId, content }),
    });
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
    const response = await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId, kind }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? copy.comments.reactFailed);
      return;
    }

    setStatus(`${REACTION_LABELS[kind]} updated.`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="manga-panel grid gap-5 rounded-[2rem] bg-white/92 p-6">
      <div className="flex flex-wrap gap-3">
        {(["CHEER", "HEART", "HYPE"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => react(kind)}
            className="rounded-full border border-black/10 bg-[#fff8ed] px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[#ff3d7f] hover:text-[#ff3d7f]"
          >
            {REACTION_LABELS[kind]} · {reactions[kind] ?? 0}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        <textarea
          rows={4}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={copy.comments.placeholder}
          className="rounded-[1.5rem] border border-black/10 bg-[#fff8ed] px-4 py-3 text-slate-900 outline-none ring-[#ff3d7f] transition focus:ring-2"
        />
        <button
          type="button"
          disabled={pending || content.trim().length < 3}
          onClick={addComment}
          className="justify-self-start rounded-full bg-[#171126] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ff3d7f] disabled:opacity-50"
        >
          {copy.comments.post}
        </button>
        {status ? <p className="text-sm font-medium text-slate-600">{status}</p> : null}
      </div>

      <div className="grid gap-3">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-[1.5rem] border border-black/10 bg-[#fffdf9] p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-950">
                {comment.author?.displayName ?? copy.comments.supporter}
                <span className="ml-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  @{comment.author?.handle ?? copy.comments.guest}
                </span>
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                {formatRelativeDate(comment.createdAt)}
              </p>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
