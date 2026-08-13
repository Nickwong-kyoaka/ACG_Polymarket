"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink, ShieldAlert } from "lucide-react";
import { AdminNoticeBar, type AdminNotice, AdminSectionCard, adminInputClass } from "@/components/admin/admin-ui";

type TakedownRow = { id: string; assetId: string; assetLabel: string; requesterName: string | null; requesterEmail: string; reason: string; evidenceUrl: string | null; status: string; createdAt: string };

export function AdminTakedownConsole({ requests }: { requests: TakedownRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<AdminNotice>(null);
  const [pending, startTransition] = useTransition();

  async function resolve(id: string, status: "REVIEWING" | "RESOLVED" | "DISMISSED") {
    const field = document.getElementById(`notes-${id}`) as HTMLTextAreaElement | null;
    const resolutionNotes = field?.value.trim() ?? "";
    if (resolutionNotes.length < 8) return setNotice({ tone: "error", message: "Add at least eight characters of review notes." });
    setBusy(id); setNotice(null);
    const response = await fetch(`/api/admin/takedowns/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, resolutionNotes }) });
    const data = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) return setNotice({ tone: "error", message: data.error ?? "Takedown update failed." });
    setNotice({ tone: "success", message: status === "RESOLVED" ? "Request resolved and media pulled." : "Review state saved." });
    startTransition(() => router.refresh());
  }

  return <AdminSectionCard title="Takedown protection queue" description="Review every request with an audit note. Resolving a case immediately pulls the media; dismissing never republishes it automatically." accent="gold"><AdminNoticeBar notice={notice} /><div className="grid gap-4">{requests.map((request) => <article key={request.id} className="rounded-[1.5rem] border border-[#171126]/10 bg-white/80 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ff3d7f]">{request.status} · {new Date(request.createdAt).toLocaleString("en-HK", { timeZone: "Asia/Hong_Kong" })}</p><h3 className="mt-2 text-base font-black text-[#171126]">{request.assetLabel}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{request.reason}</p><p className="mt-2 text-xs font-bold text-slate-400">{request.requesterName ?? "Unnamed requester"} · {request.requesterEmail}</p></div><ShieldAlert className="h-7 w-7 text-amber-600" /></div>{request.evidenceUrl ? <a href={request.evidenceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-black text-[#1659a9]">Open evidence <ExternalLink className="h-3.5 w-3.5" /></a> : null}<textarea id={`notes-${request.id}`} className={`${adminInputClass} mt-4 min-h-24 resize-y`} placeholder="Record checks, contact outcome, and decision..." /><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={Boolean(busy) || pending} onClick={() => resolve(request.id, "REVIEWING")} className="exchange-button-secondary px-3 py-2 text-[10px]">Mark reviewing</button><button type="button" disabled={Boolean(busy) || pending} onClick={() => resolve(request.id, "DISMISSED")} className="exchange-button-secondary px-3 py-2 text-[10px]">Dismiss</button><button type="button" disabled={Boolean(busy) || pending} onClick={() => resolve(request.id, "RESOLVED")} className="exchange-button-primary px-3 py-2 text-[10px]">Resolve & pull</button></div></article>)}{requests.length === 0 ? <div className="rounded-[1.5rem] border border-dashed border-[#171126]/20 py-14 text-center text-sm font-bold text-slate-400">No open takedown requests.</div> : null}</div></AdminSectionCard>;
}
