"use client";

import { useState } from "react";
import { BellPlus } from "lucide-react";

export function MarketAlertPanel({ characterId, locale, signedIn }: { characterId: string; locale: "en" | "zh-Hant"; signedIn: boolean }) {
  const [kind, setKind] = useState("SUPPORT_ACTIVITY");
  const [threshold, setThreshold] = useState(100);
  const [status, setStatus] = useState<string | null>(null);
  const zh = locale === "zh-Hant";
  async function create() {
    const response = await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, kind, thresholdValue: kind === "SUPPORT_ACTIVITY" ? null : threshold }) });
    const payload = await response.json().catch(() => ({}));
    setStatus(response.ok ? (zh ? "提醒已加入玩家房間。" : "Alert added to your player room.") : payload.error ?? (zh ? "無法建立提醒。" : "Could not create alert."));
  }
  if (!signedIn) return null;
  return <div className="exchange-panel p-5"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[#e83c62]"><BellPlus className="h-4 w-4" />{zh ? "應援提醒" : "SUPPORT ALERT"}</p><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_auto]"><select value={kind} onChange={(event) => setKind(event.target.value)} className="filter-field"><option value="SUPPORT_ACTIVITY">{zh ? "有新應援活動" : "New support activity"}</option><option value="QUOTE_ABOVE">{zh ? "報價高於" : "Quote above"}</option><option value="QUOTE_BELOW">{zh ? "報價低於" : "Quote below"}</option><option value="CAMPAIGN_MILESTONE">{zh ? "活動達到份數" : "Campaign units reach"}</option></select><input type="number" min={1} value={threshold} disabled={kind === "SUPPORT_ACTIVITY"} onChange={(event) => setThreshold(Math.max(1, Number(event.target.value) || 1))} className="filter-field disabled:opacity-40" /><button type="button" onClick={create} className="exchange-button-secondary">{zh ? "設定" : "Set"}</button></div>{status ? <p className="mt-3 text-xs font-bold text-[#19757a]" role="status">{status}</p> : null}</div>;
}
