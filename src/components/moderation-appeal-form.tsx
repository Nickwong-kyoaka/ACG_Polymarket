"use client";

import { useState } from "react";

export function ModerationAppealForm({ id, locale, admin = false }: { id: string; locale: "en" | "zh-Hant"; admin?: boolean }) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const zh = locale === "zh-Hant";
  async function submit(accepted?: boolean) {
    setBusy(true);
    try { const response = await fetch(admin ? `/api/admin/appeals/${encodeURIComponent(id)}` : `/api/reports/${encodeURIComponent(id)}/appeal`, { method: admin ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(admin ? { accepted, note } : { reason: note }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setStatus(zh ? "已送出並記錄。" : "Submitted and recorded."); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Request failed."); } finally { setBusy(false); }
  }
  return <form className="mt-4 grid gap-3" onSubmit={(event) => { event.preventDefault(); void submit(false); }}><label>{zh ? (admin ? "審查理由" : "補充說明與申訴理由") : (admin ? "Review note" : "Appeal reason")}<textarea required minLength={admin ? 8 : 20} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} className="filter-field mt-2" /></label><div className="flex gap-3"><button disabled={busy || note.trim().length < (admin ? 8 : 20)} className="exchange-button-secondary">{zh ? (admin ? "維持原處置" : "提交申訴") : (admin ? "Uphold decision" : "Submit appeal")}</button>{admin ? <button type="button" disabled={busy || note.trim().length < 8} onClick={() => void submit(true)} className="exchange-button-primary">{zh ? "接受申訴" : "Accept appeal"}</button> : null}</div>{status ? <p role="status">{status}</p> : null}</form>;
}
