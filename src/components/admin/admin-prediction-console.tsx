"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, CircleDollarSign, LoaderCircle, Lock, Play, Plus, RefreshCcw, ShieldQuestion } from "lucide-react";

interface AdminMarket {
  id: string;
  slug: string;
  question: string;
  status: string;
  closesAt: string;
  sourceUrl: string;
  sourceLabel: string;
  participantCount: number;
  tradeCount: number;
  outcomes: Array<{ id: string; key: string }>;
  latestProposal: { id: string; status: string; challengeEndsAt: string } | null;
}

interface AdminEvent {
  id: string;
  slug: string;
  title: string;
  category: string;
  markets: AdminMarket[];
}

async function apiRequest(path: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json() as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status})`);
  return payload;
}

export function AdminPredictionConsole({ events, treasury }: { events: AdminEvent[]; treasury: { balance: number; reserved: number; available: number; requiredReserve?: number } }) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function run(key: string, operation: () => Promise<unknown>) {
    setBusy(key);
    setMessage("");
    setError("");
    try {
      await operation();
      setMessage("Saved. Refreshing the desk…");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The operation failed.");
    } finally {
      setBusy("");
    }
  }

  function field(form: FormData, name: string) {
    return String(form.get(name) ?? "").trim();
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const enTitle = field(form, "enTitle");
    const enDescription = field(form, "enDescription");
    await run("create-event", () => apiRequest("/api/admin/predictions/events", "POST", {
      slug: field(form, "slug"), category: field(form, "category"), title: enTitle, description: enDescription, featured: true,
      locales: [
        { locale: "en", title: enTitle, description: enDescription },
        { locale: "zh-Hant", title: field(form, "zhTitle"), description: field(form, "zhDescription") },
      ],
    }));
  }

  async function createMarket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const enQuestion = field(form, "enQuestion");
    const enDescription = field(form, "enDescription");
    const enRules = field(form, "enRules");
    const sourceUrl = field(form, "sourceUrl");
    const sourceLabel = field(form, "sourceLabel");
    await run("create-market", () => apiRequest("/api/admin/predictions/markets", "POST", {
      eventId: field(form, "eventId"), slug: field(form, "slug"), question: enQuestion, description: enDescription,
      resolutionSourceUrl: sourceUrl, resolutionSourceLabel: sourceLabel, edgeCaseRules: enRules,
      closesAt: new Date(field(form, "closesAt")).toISOString(), timezone: "Asia/Hong_Kong",
      locales: [
        { locale: "en", question: enQuestion, description: enDescription, edgeCaseRules: enRules },
        { locale: "zh-Hant", question: field(form, "zhQuestion"), description: field(form, "zhDescription"), edgeCaseRules: field(form, "zhRules") },
      ],
      oracleSources: [{ label: sourceLabel, url: sourceUrl, priority: 1 }],
    }));
  }

  return <div className="grid gap-8">
    <section className="grid gap-4 sm:grid-cols-3">
      {[{ label: "Treasury balance", value: treasury.balance, icon: CircleDollarSign }, { label: "Reserved liability", value: treasury.reserved, icon: Lock }, { label: "Available reserve", value: treasury.available, icon: ShieldQuestion }].map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border border-[#171126]/10 bg-white p-5"><Icon className="h-5 w-5 text-[#ff3d7f]" /><p className="mt-4 font-display text-4xl text-[#171126]">{value}</p><p className="mt-1 text-xs font-bold text-slate-500">{label} SUP</p></article>)}
    </section>

    {message ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p> : null}
    {error ? <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</p> : null}

    <section className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={createEvent} className="rounded-[1.5rem] border border-[#171126]/10 bg-white p-6">
        <div className="flex items-center gap-3"><Plus className="h-5 w-5 text-[#ff3d7f]" /><h2 className="font-display text-3xl text-[#171126]">Create event</h2></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><input name="slug" required placeholder="summer-2027-watch" className="filter-field" /><input name="category" required placeholder="SEASON" className="filter-field" /></div>
        <input name="enTitle" required minLength={2} placeholder="English event title" className="filter-field mt-3" />
        <textarea name="enDescription" required minLength={10} placeholder="English event description" className="filter-field mt-3 min-h-24" />
        <input name="zhTitle" required minLength={2} placeholder="繁體中文活動標題" className="filter-field mt-3" />
        <textarea name="zhDescription" required minLength={10} placeholder="繁體中文活動介紹" className="filter-field mt-3 min-h-24" />
        <button disabled={Boolean(busy)} className="exchange-button-primary mt-4">{busy === "create-event" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create event</button>
      </form>

      <form onSubmit={createMarket} className="rounded-[1.5rem] border border-[#171126]/10 bg-white p-6">
        <div className="flex items-center gap-3"><Plus className="h-5 w-5 text-[#38a8bd]" /><h2 className="font-display text-3xl text-[#171126]">Create binary market</h2></div>
        <select name="eventId" required className="filter-field mt-5"><option value="">Choose event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><input name="slug" required placeholder="objective-question-slug" className="filter-field" /><input name="closesAt" type="datetime-local" required className="filter-field" /></div>
        <input name="enQuestion" required minLength={5} placeholder="English Yes / No question" className="filter-field mt-3" />
        <textarea name="enDescription" required minLength={10} placeholder="English resolution definition" className="filter-field mt-3 min-h-20" />
        <textarea name="enRules" required minLength={10} placeholder="English ambiguity and postponement rules" className="filter-field mt-3 min-h-20" />
        <input name="zhQuestion" required minLength={5} placeholder="繁體中文 Yes / No 問題" className="filter-field mt-3" />
        <textarea name="zhDescription" required minLength={10} placeholder="繁體中文結算定義" className="filter-field mt-3 min-h-20" />
        <textarea name="zhRules" required minLength={10} placeholder="繁體中文延期與模糊情況規則" className="filter-field mt-3 min-h-20" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><input name="sourceLabel" required placeholder="Official source label" className="filter-field" /><input name="sourceUrl" type="url" required pattern="https://.*" placeholder="https://official.example/" className="filter-field" /></div>
        <button disabled={Boolean(busy)} className="exchange-button-primary mt-4">{busy === "create-market" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create draft market</button>
      </form>
    </section>

    <section>
      <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#ff3d7f]">Market operations</p><h2 className="mt-2 font-display text-4xl text-[#171126]">Event ledger</h2></div><button type="button" onClick={() => window.location.reload()} className="exchange-button-secondary"><RefreshCcw className="h-4 w-4" />Refresh</button></div>
      <div className="mt-5 grid gap-6">{events.map((event) => <article key={event.id} className="rounded-[1.5rem] border border-[#171126]/10 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b4235a]">{event.category}</p><h3 className="mt-2 font-display text-3xl text-[#171126]">{event.title}</h3></div><span className="rounded-lg bg-[#fff2c5] px-3 py-2 text-xs font-black">{event.markets.length} markets</span></div><div className="mt-5 grid gap-4">{event.markets.map((market) => <div key={market.id} className="rounded-xl border border-[#171126]/10 bg-[#fffaf4] p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[.15em] text-slate-400">{market.status} · {market.tradeCount} trades · {market.participantCount} participants</p><h4 className="mt-2 text-sm font-black leading-6 text-[#171126]">{market.question}</h4><p className="mt-1 text-xs text-slate-500">Closes {new Date(market.closesAt).toLocaleString()}</p></div><div className="flex flex-wrap gap-2">{market.status === "DRAFT" ? <button type="button" disabled={Boolean(busy)} onClick={() => run(`open-${market.id}`, () => apiRequest(`/api/admin/predictions/${market.id}`, "PATCH", { action: "OPEN" }))} className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-800"><Play className="mr-1 inline h-3.5 w-3.5" />Open</button> : null}{market.status === "OPEN" ? <button type="button" disabled={Boolean(busy)} onClick={() => run(`lock-${market.id}`, () => apiRequest(`/api/admin/predictions/${market.id}`, "PATCH", { action: "LOCK" }))} className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-black text-amber-900"><Lock className="mr-1 inline h-3.5 w-3.5" />Lock</button> : null}{market.latestProposal ? <button type="button" disabled={Boolean(busy)} onClick={() => run(`finalize-${market.id}`, () => apiRequest(`/api/admin/predictions/${market.id}/finalize`, "POST", { proposalId: market.latestProposal?.id }))} className="rounded-lg bg-sky-100 px-3 py-2 text-xs font-black text-sky-900"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Finalize</button> : null}</div></div>{["LOCKED", "OPEN"].includes(market.status) && !market.latestProposal ? <form className="mt-4 grid gap-2 border-t border-[#171126]/10 pt-4 sm:grid-cols-[110px_1fr_1fr_auto]" onSubmit={(submitEvent) => { submitEvent.preventDefault(); const data = new FormData(submitEvent.currentTarget); void run(`propose-${market.id}`, () => apiRequest(`/api/admin/predictions/${market.id}/propose`, "POST", { outcome: field(data, "outcome"), evidenceUrl: field(data, "evidenceUrl"), reasoning: field(data, "reasoning") })); }}><select name="outcome" className="filter-field"><option>YES</option><option>NO</option></select><input name="evidenceUrl" type="url" required defaultValue={market.sourceUrl} className="filter-field" /><input name="reasoning" required minLength={10} placeholder="Evidence-based reasoning" className="filter-field" /><button className="rounded-lg bg-[#171126] px-3 py-2 text-xs font-black text-white">Propose</button></form> : null}<form className="mt-3 flex gap-2" onSubmit={(submitEvent) => { submitEvent.preventDefault(); const data = new FormData(submitEvent.currentTarget); void run(`void-${market.id}`, () => apiRequest(`/api/admin/predictions/${market.id}/void`, "POST", { reason: field(data, "reason") })); }}><input name="reason" required minLength={10} placeholder="Void and refund reason" className="filter-field" /><button className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-black text-rose-800">Void</button></form></div>)}</div></article>)}</div>
    </section>
  </div>;
}
