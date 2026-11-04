"use client";

import { useEffect, useMemo, useState } from "react";
import { Clipboard, Filter, MessageSquareWarning, Search, ShieldAlert } from "lucide-react";
import type { Character } from "@/lib/types";
import { AdminSectionCard, adminInputClass } from "@/components/admin/admin-ui";

type ModerationReport = {
  id: string;
  userId: string;
  characterId?: string | null;
  commentId?: string | null;
  postId?: string | null;
  post?: { id: string; slug: string; title: string; body: string; authorId: string; status: string; language: string } | null;
  comment?: { id: string; content: string; userId: string; status: string } | null;
  reason: string;
  detail?: string | null;
  status?: string;
  resolution?: string | null;
  createdAt: string;
};

export function AdminModerationQueue({
  reports,
  characters,
}: {
  reports: ModerationReport[];
  characters: Character[];
}) {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<"ALL" | "POST" | "COMMENT" | "CHARACTER">("ALL");
  const [items, setItems] = useState(reports);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [openOnly, setOpenOnly] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/reports", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("Could not load report context."); return response.json(); })
      .then((data) => setItems(data.reports))
      .catch((error) => { if (!controller.signal.aborted) setMessage(error.message); });
    return () => controller.abort();
  }, []);
  const [copied, setCopied] = useState<string | null>(null);
  const characterNames = new Map(characters.map((character) => [character.id, character.name]));
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((report) => {
      if (openOnly && ["RESOLVED", "DISMISSED"].includes(report.status ?? "")) return false;
      const matchesTarget =
        target === "ALL" || (target === "COMMENT" ? Boolean(report.commentId) : target === "POST" ? Boolean(report.postId) && !report.commentId : Boolean(report.characterId) && !report.commentId && !report.postId);
      const haystack = `${report.reason} ${report.detail ?? ""} ${report.id} ${report.commentId ?? ""} ${report.characterId ?? ""} ${report.post?.title ?? ""} ${report.postId ?? ""}`.toLowerCase();
      return matchesTarget && (!normalized || haystack.includes(normalized));
    });
  }, [query, items, target, openOnly]);

  async function decide(report: ModerationReport, decision: "REMOVE" | "DISMISS" | "WARN" | "SUSPEND") {
    const note = notes[report.id]?.trim() ?? "";
    if (note.length < 8) { setMessage("Add a decision note of at least 8 characters."); return; }
    if ((decision === "REMOVE" || decision === "SUSPEND") && !window.confirm(decision === "SUSPEND" ? "Remove this reported content and suspend the creator from publishing?" : "Remove this reported content from public view?")) return;
    setPending(report.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/reports/${encodeURIComponent(report.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, note }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Decision failed.");
      setItems((current) => current.map((item) => item.id === report.id ? data.report : item));
      setMessage("Decision saved. The reporter and affected creator have been notified.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Decision failed."); }
    finally { setPending(null); }
  }

  async function copyReference(report: ModerationReport) {
    const value = [report.id, report.commentId, report.postId, report.characterId].filter(Boolean).join(" · ");
    await navigator.clipboard.writeText(value);
    setCopied(report.id);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <AdminSectionCard
      title="Moderation triage queue"
      description="Inspect reported content and save an audited decision. Suspend removes the reported content and blocks future creator publishing."
      accent="pink"
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${adminInputClass} pl-11`} placeholder="Search reason, detail, or reference ID" />
        </label>
        <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-[#171126]/10 bg-white/75 p-1.5">
          <Filter className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
          {(["ALL", "POST", "COMMENT", "CHARACTER"] as const).map((value) => (
            <button key={value} type="button" onClick={() => setTarget(value)} className={`rounded-xl px-3 py-2 text-xs font-black ${target === value ? "bg-[#171126] text-white" : "text-slate-500 hover:bg-[#fff2c5]"}`}>{value}</button>
          ))}
        </div>
      </div>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={openOnly} onChange={(event) => setOpenOnly(event.target.checked)} />Open reports only</label>
      {message ? <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm">{message}</p> : null}
      <div className="grid gap-3">
        {filtered.map((report, index) => (
          <article key={report.id} className="grid gap-4 rounded-[1.5rem] border border-[#171126]/10 bg-white/80 p-5 md:grid-cols-[auto_1fr_auto] md:items-start">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
              {report.commentId ? <MessageSquareWarning className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff3d7f]">Queue #{index + 1}</span>
                {report.status ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-800">{report.status.replaceAll("_", " ")}</span> : null}
                <span className="text-xs font-bold text-slate-400">{new Date(report.createdAt).toLocaleString("en-HK", { timeZone: "Asia/Hong_Kong", dateStyle: "medium", timeStyle: "short" })} HKT</span>
              </div>
              <h3 className="mt-2 text-base font-black text-[#171126]">{report.reason}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{report.detail || "No additional detail supplied."}</p>
              {report.comment ? <blockquote className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm">{report.comment.content}<small className="block">Comment state: {report.comment.status}</small></blockquote> : report.post ? <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><a href={`/${report.post.language === "ZH_HANT" ? "zh-Hant" : "en"}/posts/${encodeURIComponent(report.post.slug)}`} target="_blank" rel="noreferrer" className="font-bold underline">{report.post.title}</a><p className="mt-2 whitespace-pre-wrap">{report.post.body}</p><small>Post state: {report.post.status}</small></div> : null}
              {report.resolution ? <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Resolution note: {report.resolution}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] text-slate-500">
                {report.characterId ? <span className="rounded-lg bg-[#fff8ed] px-2 py-1">Character: {characterNames.get(report.characterId) ?? report.characterId}</span> : null}
                {report.commentId ? <span className="rounded-lg bg-[#fff8ed] px-2 py-1">Comment: {report.commentId}</span> : null}
                {report.postId ? <span className="rounded-lg bg-[#fff8ed] px-2 py-1">Post: {report.postId}</span> : null}
                <span className="rounded-lg bg-[#fff8ed] px-2 py-1">Report: {report.id}</span>
              </div>
              {!["RESOLVED", "DISMISSED"].includes(report.status ?? "") ? <div className="mt-4 grid gap-2"><label className="text-xs font-bold" htmlFor={`decision-${report.id}`}>Decision note (sent to the creator)</label><textarea id={`decision-${report.id}`} value={notes[report.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))} minLength={8} maxLength={2000} className={adminInputClass} placeholder="Explain the policy decision and any next steps." /><div className="flex flex-wrap gap-2">{(["DISMISS", "REMOVE", "WARN", "SUSPEND"] as const).map((decision) => <button key={decision} type="button" disabled={pending !== null || ((decision === "WARN" || decision === "SUSPEND") && !report.comment && !report.post)} onClick={() => decide(report, decision)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold disabled:opacity-40">{pending === report.id ? "Saving..." : decision === "SUSPEND" ? "Suspend creator" : decision}</button>)}</div></div> : null}
            </div>
            <button type="button" onClick={() => copyReference(report)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#171126]/10 px-3 py-2 text-xs font-black text-slate-600 hover:border-[#ff3d7f] hover:text-[#ff3d7f]">
              <Clipboard className="h-3.5 w-3.5" /> {copied === report.id ? "Copied" : "Copy refs"}
            </button>
          </article>
        ))}
        {filtered.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-[#171126]/20 bg-white/50 py-14 text-center text-slate-500"><ShieldAlert className="mx-auto mb-3 h-7 w-7" />No reports match this view.</div>
        ) : null}
      </div>
    </AdminSectionCard>
  );
}
