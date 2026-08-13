"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FlagTriangleRight } from "lucide-react";
import { AdminNoticeBar, type AdminNotice, AdminSectionCard, adminInputClass } from "@/components/admin/admin-ui";

type CampaignRow = {
  id: string;
  slug: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  title: string;
  characterName: string;
  currentUnits: number;
  goalUnits: number;
};

export function AdminCampaignConsole({ campaigns }: { campaigns: CampaignRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<AdminNotice>(null);
  const [pending, startTransition] = useTransition();

  async function update(id: string, payload: Record<string, unknown>) {
    setBusy(id); setNotice(null);
    const response = await fetch(`/api/admin/campaigns/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) return setNotice({ tone: "error", message: data.error ?? "Campaign update failed." });
    setNotice({ tone: "success", message: "Campaign state saved." });
    startTransition(() => router.refresh());
  }

  return <AdminSectionCard title="Community campaign desk" description="Adjust goals and release states without editing seed files. Current support can never be erased by lowering a goal.">
    <AdminNoticeBar notice={notice} />
    <div className="grid gap-3">{campaigns.map((campaign) => <article key={campaign.id} className="grid gap-4 rounded-[1.5rem] border border-[#171126]/10 bg-white/80 p-5 lg:grid-cols-[1fr_auto_auto] lg:items-center"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ff3d7f]">{campaign.characterName}</p><h3 className="mt-1 text-base font-black text-[#171126]">{campaign.title}</h3><p className="mt-2 text-xs font-bold text-slate-400">{campaign.currentUnits} / {campaign.goalUnits} support units · {campaign.status}</p></div><label className="flex items-center gap-2 text-xs font-black text-slate-500">GOAL<input id={`goal-${campaign.id}`} defaultValue={campaign.goalUnits} type="number" min={campaign.currentUnits} className={`${adminInputClass} w-28 py-2`} /></label><div className="flex flex-wrap gap-2"><button type="button" disabled={busy === campaign.id || pending} onClick={() => { const field = document.getElementById(`goal-${campaign.id}`) as HTMLInputElement | null; if (field) void update(campaign.id, { goalUnits: Number(field.value) }); }} className="exchange-button-secondary px-3 py-2 text-[10px]">Save goal</button>{campaign.status === "ACTIVE" ? <button type="button" disabled={Boolean(busy) || pending} onClick={() => update(campaign.id, { status: "ARCHIVED" })} className="exchange-button-secondary px-3 py-2 text-[10px]">Archive</button> : <button type="button" disabled={Boolean(busy) || pending} onClick={() => update(campaign.id, { status: "ACTIVE" })} className="exchange-button-primary px-3 py-2 text-[10px]"><FlagTriangleRight className="h-3.5 w-3.5" />Activate</button>}</div></article>)}</div>
  </AdminSectionCard>;
}
