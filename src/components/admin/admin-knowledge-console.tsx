"use client";

import { useState } from "react";
import { BookOpenCheck, Check, ExternalLink, RotateCcw, X } from "lucide-react";
import {
  AdminNoticeBar,
  AdminSectionCard,
  adminInputClass,
  type AdminNotice,
  postAdmin,
} from "@/components/admin/admin-ui";

type KnowledgeProposal = {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  reason: string;
  createdAt: string;
  author: { name: string | null; email: string | null; handle: string | null };
  changes: Array<{
    id: string;
    fieldKey: string;
    oldValue: unknown;
    newValue: unknown;
    sourceUrl: string;
  }>;
};

type RevisionSummary = {
  id: string;
  entityType: string;
  entityId: string;
  revision: number;
  summary: string;
  createdAt: string;
};

type SnapshotSummary = {
  id: string;
  provider: string;
  entityType: string;
  entityId: string;
  externalId: string;
  sourceUrl: string;
  checksum: string;
  retrievedAt: string;
};

export function AdminKnowledgeConsole({
  counts,
  initialProposals,
  revisions,
  snapshots,
}: {
  counts: Record<string, number>;
  initialProposals: KnowledgeProposal[];
  revisions: RevisionSummary[];
  snapshots: SnapshotSummary[];
}) {
  const [proposals, setProposals] = useState(initialProposals);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<AdminNotice>(null);

  async function decide(id: string, decision: "APPROVE" | "REQUEST_CHANGES" | "REJECT") {
    setPending(`${id}:${decision}`);
    setNotice(null);
    try {
      await postAdmin(`/api/admin/edit-proposals/${id}/decision`, {
        decision,
        note: notes[id] ?? "",
      });
      setProposals((current) =>
        decision === "REQUEST_CHANGES"
          ? current.map((proposal) =>
              proposal.id === id ? { ...proposal, status: "NEEDS_CHANGES" } : proposal,
            )
          : current.filter((proposal) => proposal.id !== id),
      );
      setNotice({
        tone: "success",
        message:
          decision === "APPROVE"
            ? "The sourced edit is live and a revision was recorded."
            : decision === "REQUEST_CHANGES"
              ? "The proposal was returned to its author."
              : "The proposal was rejected with an audit record.",
      });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Review failed." });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(counts).map(([label, value]) => (
          <div key={label} className="rounded-[1.35rem] border border-[#171126]/10 bg-white/85 p-4">
            <p className="font-display text-3xl text-[#171126]">{value}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              {label.replaceAll(/([A-Z])/g, " $1")}
            </p>
          </div>
        ))}
      </section>

      <AdminNoticeBar notice={notice} />

      <AdminSectionCard
        title="Sourced edit proposals"
        description="Compare each field with its saved value and open the evidence before accepting it. Approval writes the entity, citations, revision, decision, and trust event together."
        accent="cyan"
      >
        <div className="grid gap-4">
          {proposals.map((proposal) => (
            <article key={proposal.id} className="rounded-[1.5rem] border border-[#171126]/10 bg-white/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1659a9]">
                    {proposal.entityType} · {proposal.status.replaceAll("_", " ")}
                  </p>
                  <h3 className="mt-2 text-lg font-black text-[#171126]">{proposal.reason}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {proposal.author.handle ? `@${proposal.author.handle}` : proposal.author.name ?? proposal.author.email ?? "Contributor"}
                    {" · "}{proposal.entityId}
                  </p>
                </div>
                <span className="rounded-full bg-[#fff2c5] px-3 py-1 text-[10px] font-black text-[#9c4300]">
                  {proposal.changes.length} field{proposal.changes.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {proposal.changes.map((change) => (
                  <div key={change.id} className="grid gap-3 rounded-2xl bg-[#fff8ed] p-4 lg:grid-cols-[10rem_1fr_1fr_auto] lg:items-start">
                    <strong className="text-xs text-[#171126]">{change.fieldKey}</strong>
                    <div><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Current</p><p className="mt-1 break-words text-xs text-slate-600">{formatValue(change.oldValue)}</p></div>
                    <div><p className="text-[9px] font-black uppercase tracking-wider text-[#ff3d7f]">Proposed</p><p className="mt-1 break-words text-xs font-bold text-[#171126]">{formatValue(change.newValue)}</p></div>
                    <a href={change.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-[#1659a9] hover:underline">Source <ExternalLink className="h-3.5 w-3.5" /></a>
                  </div>
                ))}
              </div>

              {proposal.status === "SUBMITTED" ? (
                <div className="mt-4 grid gap-3">
                  <textarea
                    className={adminInputClass}
                    rows={2}
                    value={notes[proposal.id] ?? ""}
                    onChange={(event) => setNotes((current) => ({ ...current, [proposal.id]: event.target.value }))}
                    placeholder="Review note; required when returning or rejecting"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={pending !== null} onClick={() => decide(proposal.id, "APPROVE")} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#171126] px-5 text-sm font-black text-white transition hover:bg-[#ff3d7f] disabled:opacity-45"><Check className="h-4 w-4" />{pending === `${proposal.id}:APPROVE` ? "Approving..." : "Approve"}</button>
                    <button type="button" disabled={pending !== null} onClick={() => decide(proposal.id, "REQUEST_CHANGES")} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-5 text-sm font-black text-amber-800 disabled:opacity-45"><RotateCcw className="h-4 w-4" />Request changes</button>
                    <button type="button" disabled={pending !== null} onClick={() => decide(proposal.id, "REJECT")} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 text-sm font-black text-rose-700 disabled:opacity-45"><X className="h-4 w-4" />Reject</button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">Waiting for the author to revise and resubmit.</p>
              )}
            </article>
          ))}
          {proposals.length === 0 ? <EmptyState label="No sourced edits are waiting." /> : null}
        </div>
      </AdminSectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSectionCard title="Recent revisions" description="Append-only snapshots created by approved proposals." accent="pink">
          <div className="grid gap-2">
            {revisions.map((revision) => (
              <div key={revision.id} className="rounded-2xl bg-[#fff8ed] p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#ff3d7f]">{revision.entityType} · revision {revision.revision}</p>
                <p className="mt-2 text-sm font-bold text-[#171126]">{revision.summary}</p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">{revision.entityId}</p>
              </div>
            ))}
            {revisions.length === 0 ? <EmptyState label="No approved revisions yet." /> : null}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Import snapshots" description="Recent external payloads retained for reproducible catalog decisions." accent="gold">
          <div className="grid gap-2">
            {snapshots.map((snapshot) => (
              <a key={snapshot.id} href={snapshot.sourceUrl} target="_blank" rel="noreferrer" className="group rounded-2xl bg-[#fff8ed] p-4 hover:bg-[#fff2c5]">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#9c4300]">{snapshot.provider} · {snapshot.entityType}</p>
                <p className="mt-2 text-sm font-bold text-[#171126]">External #{snapshot.externalId}</p>
                <p className="mt-1 truncate font-mono text-[10px] text-slate-400">{snapshot.checksum}</p>
              </a>
            ))}
            {snapshots.length === 0 ? <EmptyState label="No external snapshots yet." /> : null}
          </div>
        </AdminSectionCard>
      </div>
    </div>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "Not set";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-[1.5rem] border border-dashed border-[#171126]/20 py-10 text-center text-sm text-slate-500"><BookOpenCheck className="mx-auto mb-2 h-6 w-6" />{label}</div>;
}
