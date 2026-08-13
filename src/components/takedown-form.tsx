"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import type { PublicLocale } from "@/components/acg-locale";

export function TakedownForm({ locale, defaultAssetId = "", assets = [] }: { locale: PublicLocale; defaultAssetId?: string; assets?: Array<{ id: string; label: string; character: string }> }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const copy = locale === "zh-Hant" ? { title: "素材下架申請", body: "如果你是創作者、權利人或代表，請提供可核對的公開來源與原因。聯絡資料只供管理員處理申請。", asset: "需要下架的素材", email: "聯絡電郵", source: "原始作品或權利證明 URL", reason: "申請原因與你和作品的關係", send: "送出申請", sending: "送出中…", sent: "已收到申請，管理員會在後台審核。", error: "未能送出，請確認欄位後再試。" } : { title: "Media takedown request", body: "If you are the creator, rights holder, or their representative, provide a verifiable public source and your reason. Contact details remain admin-only.", asset: "Media to remove", email: "Contact email", source: "Original work or rights evidence URL", reason: "Reason and your relationship to the work", send: "Submit request", sending: "Submitting…", sent: "Request received for admin review.", error: "Could not submit. Please check the fields and retry." };

  async function submit(formData: FormData) {
    setStatus("sending");
    const response = await fetch("/api/takedown", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(formData)) });
    setStatus(response.ok ? "sent" : "error");
  }

  return <form action={submit} className="exchange-panel grid gap-5 p-6 sm:p-8">
    <div><Flag className="h-6 w-6 text-[#e83c62]" /><h2 className="mt-4 font-display text-3xl">{copy.title}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">{copy.body}</p></div>
    <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{copy.asset}</span><select name="assetId" defaultValue={defaultAssetId} required className="filter-field"><option value="" disabled>{locale === "zh-Hant" ? "選擇素材" : "Select media"}</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.character} · {asset.label}</option>)}</select></label>
    <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{copy.email}</span><input name="requesterEmail" type="email" required className="filter-field" /></label>
    <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{copy.source}</span><input name="evidenceUrl" type="url" required placeholder="https://" className="filter-field" /></label>
    <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{copy.reason}</span><textarea name="reason" required minLength={20} maxLength={2000} rows={5} className="filter-field resize-y" /></label>
    <label className="flex items-start gap-3 text-xs leading-6 text-slate-500"><input name="goodFaith" value="true" type="checkbox" required className="mt-1 accent-[#e83c62]" /><span>{locale === "zh-Hant" ? "我確認此申請基於善意，內容真實，並同意平台為處理下架而聯絡我。" : "I confirm this is a good-faith and accurate request, and consent to contact for takedown handling."}</span></label>
    <button type="submit" disabled={status === "sending" || status === "sent"} className="exchange-button-primary disabled:cursor-not-allowed disabled:opacity-50">{status === "sending" ? copy.sending : copy.send}</button>
    {status === "sent" ? <p className="text-sm font-bold text-[#19757a]" role="status">{copy.sent}</p> : null}
    {status === "error" ? <p className="text-sm font-bold text-[#e83c62]" role="alert">{copy.error}</p> : null}
  </form>;
}
