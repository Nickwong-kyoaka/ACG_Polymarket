"use client";

import { useState } from "react";
import type { PublicLocale } from "@/components/acg-locale";

export function EntityProposalForm({ entityType, entityId, currentSummary, locale, fields }: { entityType: "SERIES" | "CHARACTER"; entityId: string; currentSummary: string; locale: PublicLocale; fields?: Array<{ key: string; label: string; value: string; localized?: boolean }> }) {
  const zh = locale === "zh-Hant";
  const options = fields ?? [{ key: "summary", label: zh ? "介紹" : "Summary", value: currentSummary }];
  const [field, setField] = useState(options[0].key);
  const [summary, setSummary] = useState(options[0].value);
  const [sourceUrl, setSource] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; revision: number; createdAt: string; summary: string }>>([]);
  async function loadHistory() {
    setPending(true);
    try { const response = await fetch(`/api/entities/${entityType}/${entityId}/revisions`); if (!response.ok) throw new Error(); setHistory((await response.json()).revisions); }
    catch { setMessage(zh ? "修訂記錄暫時無法讀取。" : "Revision history is unavailable."); } finally { setPending(false); }
  }
  async function submit() {
    if (pending) return;
    setPending(true);
    try { const selected = options.find((item) => item.key === field)!; const response = await fetch("/api/edit-proposals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entityType, entityId, reason, changes: [{ fieldKey: selected.localized === false ? field : `locales.${zh ? "ZH_HANT" : "EN"}.${field}`, newValue: summary, sourceUrl }] }) }); const body = await response.json(); if (!response.ok) throw new Error(response.status === 401 ? (zh ? "登入後就能提交資料修訂。" : "Sign in to suggest an edit.") : body.error); setMessage(zh ? "修訂已送到資料編輯桌，通過後會更新在這裡。" : "Your edit reached the review desk. It will appear here after approval."); }
    catch (error) { setMessage(error instanceof Error ? error.message : (zh ? "未能送出。" : "Could not submit.")); } finally { setPending(false); }
  }
  return <details className="exchange-panel p-6"><summary className="cursor-pointer font-bold">{zh ? "資料修訂與記錄" : "Corrections and history"}</summary>
    <form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label>{zh ? "選擇欄位" : "Choose a field"}<select className="filter-field mt-2" value={field} onChange={(event) => { setField(event.target.value); setSummary(options.find((item) => item.key === event.target.value)?.value ?? ""); }}>{options.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
      <label>{zh ? "建議內容" : "Suggested value"}<textarea className="filter-field mt-2" rows={5} required maxLength={6000} value={summary} onChange={(event) => setSummary(event.target.value)} /></label><label>{zh ? "來源頁（HTTPS）" : "Source page (HTTPS)"}<input type="url" pattern="https://.*" required className="filter-field mt-2" value={sourceUrl} onChange={(event) => setSource(event.target.value)} /></label><label>{zh ? "修改理由" : "Reason for this edit"}<input className="filter-field mt-2" required minLength={8} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></label><button disabled={pending} className="exchange-button-primary">{zh ? "提交修訂" : "Submit correction"}</button>{message ? <p role="status">{message}</p> : null}
    </form><button type="button" disabled={pending} onClick={() => void loadHistory()} className="exchange-button-secondary mt-5">{zh ? "查看已批准的修訂" : "Load approved revisions"}</button><div className="mt-4 grid gap-3">{history.map((entry) => <article key={entry.id} className="border-t border-black/10 pt-3 text-sm"><p>#{entry.revision} · {new Intl.DateTimeFormat(zh ? "zh-HK" : "en-HK", { dateStyle: "medium", timeZone: "Asia/Hong_Kong" }).format(new Date(entry.createdAt))}</p><p className="mt-2 whitespace-pre-wrap text-slate-600">{entry.summary}</p></article>)}</div>
  </details>;
}
