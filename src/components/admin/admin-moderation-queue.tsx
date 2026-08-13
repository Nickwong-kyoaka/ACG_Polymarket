"use client";

import { useMemo, useState } from "react";
import { Clipboard, Filter, MessageSquareWarning, Search, ShieldAlert } from "lucide-react";
import type { Character } from "@/lib/types";
import { AdminSectionCard, adminInputClass } from "@/components/admin/admin-ui";

type ModerationReport = {
  id: string;
  userId: string;
  characterId?: string | null;
  commentId?: string | null;
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
  const [target, setTarget] = useState<"ALL" | "COMMENT" | "CHARACTER">("ALL");
  const [copied, setCopied] = useState<string | null>(null);
  const characterNames = new Map(characters.map((character) => [character.id, character.name]));
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesTarget =
        target === "ALL" || (target === "COMMENT" ? Boolean(report.commentId) : Boolean(report.characterId));
      const haystack = `${report.reason} ${report.detail ?? ""} ${report.id} ${report.commentId ?? ""} ${report.characterId ?? ""}`.toLowerCase();
      return matchesTarget && (!normalized || haystack.includes(normalized));
    });
  }, [query, reports, target]);

  async function copyReference(report: ModerationReport) {
    const value = [report.id, report.commentId, report.characterId].filter(Boolean).join(" · ");
    await navigator.clipboard.writeText(value);
    setCopied(report.id);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <AdminSectionCard
      title="Moderation triage queue"
      description="Filter incoming reports, inspect their context, and copy stable references for investigation. Resolution controls are intentionally absent until the backend exposes a persistent moderation endpoint."
      accent="pink"
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${adminInputClass} pl-11`} placeholder="Search reason, detail, or reference ID" />
        </label>
        <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-[#171126]/10 bg-white/75 p-1.5">
          <Filter className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
          {(["ALL", "COMMENT", "CHARACTER"] as const).map((value) => (
            <button key={value} type="button" onClick={() => setTarget(value)} className={`rounded-xl px-3 py-2 text-xs font-black ${target === value ? "bg-[#171126] text-white" : "text-slate-500 hover:bg-[#fff2c5]"}`}>{value}</button>
          ))}
        </div>
      </div>
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
              {report.resolution ? <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Resolution note: {report.resolution}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] text-slate-500">
                {report.characterId ? <span className="rounded-lg bg-[#fff8ed] px-2 py-1">Character: {characterNames.get(report.characterId) ?? report.characterId}</span> : null}
                {report.commentId ? <span className="rounded-lg bg-[#fff8ed] px-2 py-1">Comment: {report.commentId}</span> : null}
                <span className="rounded-lg bg-[#fff8ed] px-2 py-1">Report: {report.id}</span>
              </div>
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
