"use client";

import { useState } from "react";
import { Check, ExternalLink, FileClock, RotateCcw, X } from "lucide-react";
import {
  AdminNoticeBar,
  AdminSectionCard,
  adminInputClass,
  type AdminNotice,
  postAdmin,
} from "@/components/admin/admin-ui";

type ReviewPost = {
  id: string;
  slug: string;
  status: string;
  title: string;
  body: string;
  language: string;
  kind: string;
  aiGenerated: boolean;
  author: { name: string | null; email: string | null; handle: string | null };
  media: Array<{
    id: string;
    altText: string;
    sourceUrl: string | null;
    sourceLabel: string | null;
    status: string;
  }>;
};

export function AdminCommunityConsole({
  creatorCount,
  probationCount,
  initialPosts,
}: {
  creatorCount: number;
  probationCount: number;
  initialPosts: ReviewPost[];
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<AdminNotice>(null);

  async function review(id: string, decision: "APPROVE" | "REQUEST_CHANGES" | "REJECT") {
    setPending(`${id}:${decision}`);
    setNotice(null);
    try {
      await postAdmin(`/api/admin/posts/${id}/review`, { decision, note: notes[id] ?? "" });
      setPosts((current) => current.filter((post) => post.id !== id));
      setNotice({
        tone: "success",
        message:
          decision === "APPROVE"
            ? "The post and its reviewed media are now published."
            : decision === "REQUEST_CHANGES"
              ? "The post was returned with your note."
              : "The post was removed from the publishing queue.",
      });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Review failed." });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Creator profiles" value={creatorCount} />
        <Metric label="In first-three review" value={probationCount} />
        <Metric label="Posts waiting" value={posts.length} />
      </div>
      <AdminNoticeBar notice={notice} />
      <AdminSectionCard
        title="Community publishing desk"
        description="New creators stay in review for their first three approved posts. New images always keep their own source and media review state."
        accent="pink"
      >
        <div className="grid gap-4">
          {posts.map((post) => (
            <article key={post.id} className="rounded-[1.5rem] border border-[#171126]/10 bg-white/85 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff3d7f]">{post.kind} · {post.language} · {post.status.replaceAll("_", " ")}</p>
                  <h3 className="mt-2 font-display text-2xl text-[#171126]">{post.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{post.author.handle ? `@${post.author.handle}` : post.author.name ?? post.author.email ?? "Creator"}{post.aiGenerated ? " · AI-assisted" : ""}</p>
                </div>
                <span className="rounded-full bg-[#e9f7ff] px-3 py-1 text-[10px] font-black text-[#1659a9]">{post.media.length} media</span>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{post.body}</p>

              {post.media.length ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {post.media.map((media) => (
                    <div key={media.id} className="rounded-2xl bg-[#fff8ed] p-4">
                      <div className="flex items-center justify-between gap-2"><strong className="text-xs text-[#171126]">{media.altText}</strong><span className="text-[9px] font-black text-slate-400">{media.status}</span></div>
                      <p className="mt-2 text-xs text-slate-500">{media.sourceLabel || "Source label missing"}</p>
                      {media.sourceUrl ? <a href={media.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#1659a9] hover:underline">Inspect source <ExternalLink className="h-3.5 w-3.5" /></a> : <p className="mt-2 text-xs font-bold text-rose-600">Source URL missing</p>}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3">
                <textarea className={adminInputClass} rows={2} value={notes[post.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Review note; required when returning or rejecting" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={pending !== null} onClick={() => review(post.id, "APPROVE")} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#171126] px-5 text-sm font-black text-white transition hover:bg-[#ff3d7f] disabled:opacity-45"><Check className="h-4 w-4" />{pending === `${post.id}:APPROVE` ? "Publishing..." : "Publish"}</button>
                  <button type="button" disabled={pending !== null} onClick={() => review(post.id, "REQUEST_CHANGES")} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-5 text-sm font-black text-amber-800 disabled:opacity-45"><RotateCcw className="h-4 w-4" />Return</button>
                  <button type="button" disabled={pending !== null} onClick={() => review(post.id, "REJECT")} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 text-sm font-black text-rose-700 disabled:opacity-45"><X className="h-4 w-4" />Reject</button>
                </div>
              </div>
            </article>
          ))}
          {posts.length === 0 ? <div className="rounded-[1.5rem] border border-dashed border-[#171126]/20 py-14 text-center text-sm text-slate-500"><FileClock className="mx-auto mb-3 h-7 w-7" />The publishing queue is clear.</div> : null}
        </div>
      </AdminSectionCard>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-[1.35rem] border border-[#171126]/10 bg-white/85 p-5"><p className="font-display text-4xl text-[#171126]">{value}</p><p className="mt-1 text-xs font-bold text-slate-500">{label}</p></div>;
}
