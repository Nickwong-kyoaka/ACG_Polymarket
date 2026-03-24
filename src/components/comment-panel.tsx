"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { REACTION_LABELS } from "@/lib/constants";
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
}: {
  characterId: string;
  comments: CommentItem[];
  reactions: Record<string, number>;
}) {
  const router = useRouter();
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
      setStatus(payload.error ?? "Unable to post comment.");
      return;
    }

    setContent("");
    setStatus("Comment posted.");
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
      setStatus(payload.error ?? "Unable to react.");
      return;
    }

    setStatus(`${REACTION_LABELS[kind]} updated.`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-5 rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.5)]">
      <div className="flex flex-wrap gap-3">
        {(["CHEER", "HEART", "HYPE"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => react(kind)}
            className="rounded-full border border-black/10 bg-[#fff8ef] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#db5d35] hover:text-[#db5d35]"
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
          placeholder="Share what you love about this character."
          className="rounded-[1.5rem] border border-black/10 bg-[#fff9f2] px-4 py-3 text-slate-900 outline-none ring-[#db5d35] transition focus:ring-2"
        />
        <button
          type="button"
          disabled={pending || content.trim().length < 3}
          onClick={addComment}
          className="justify-self-start rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          Post appreciation
        </button>
        {status ? <p className="text-sm font-medium text-slate-600">{status}</p> : null}
      </div>

      <div className="grid gap-3">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-[1.5rem] border border-black/10 bg-[#fffdf9] p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-950">
                {comment.author?.displayName ?? "Supporter"}
                <span className="ml-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  @{comment.author?.handle ?? "guest"}
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
