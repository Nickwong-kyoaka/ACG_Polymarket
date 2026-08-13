"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, Clock3, ReceiptText, Ticket } from "lucide-react";
import { getExchangeCopy, type PublicLocale } from "@/components/acg-locale";
import { cn, currencyLabel } from "@/lib/utils";

export type SupportTradePanelProps = { characterId: string; quote: number; sellQuote: number; balance: number; ownedUnits: number; locale?: PublicLocale; signedIn?: boolean };
type Side = "BUY" | "SELL";
type SignedQuote = { quoteToken: string; expiresAt: string; side: Side; quantity: number; total: number; averagePrice: number; firstPrice: number; lastPrice: number; quoteBefore: number; quoteAfter: number; supplyBefore: number; supplyAfter: number; affordable: boolean; availableUnits: number };
type Receipt = { id: string; side: Side; quantity: number; total: number; averagePrice: number; firstPrice: number; lastPrice: number; quoteAfter: number; timestamp: string };

export function SupportTradePanel({ characterId, quote, sellQuote, balance, ownedUnits, locale = "en", signedIn = true }: SupportTradePanelProps) {
  const router = useRouter();
  const copy = getExchangeCopy(locale);
  const [quantity, setQuantity] = useState(1);
  const [side, setSide] = useState<Side>("BUY");
  const [signedQuote, setSignedQuote] = useState<SignedQuote | null>(null);
  const [quoteState, setQuoteState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [status, setStatus] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const zh = locale === "zh-Hant";

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      setQuoteState("loading"); setSignedQuote(null); setStatus(null);
      try {
        const response = await fetch(`/api/characters/${encodeURIComponent(characterId)}/quote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ side, quantity }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? copy.trade.failed);
        if (active) { setSignedQuote(payload); setQuoteState("ready"); }
      } catch (error) { if (active) { setQuoteState("error"); setStatus(error instanceof Error ? error.message : copy.trade.failed); } }
    }, 250);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [characterId, copy.trade.failed, quantity, refreshKey, side, signedIn]);

  function marketError(payload: { error?: string; code?: string }) {
    if (!zh) return payload.error ?? copy.trade.failed;
    const translated: Record<string, string> = { QUOTE_CHANGED: "應援供應量已變更，已為你重新取得報價。", QUOTE_EXPIRED: "這張報價票已過期，已重新取得最新價格。", INSUFFICIENT_BALANCE: "SUP 餘額不足。", INSUFFICIENT_POSITION: "可退回的應援份數不足。", INVALID_QUOTE: "報價票無效，請重新取得。" };
    return translated[payload.code ?? ""] ?? copy.trade.failed;
  }

  async function submit() {
    if (submitting || !signedQuote) return;
    setStatus(null); setReceipt(null); setSubmitting(true);
    try {
      const response = await fetch(`/api/characters/${characterId}/${side.toLowerCase()}`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ quantity, quoteToken: signedQuote.quoteToken }) });
      const payload = await response.json();
      if (!response.ok) { setStatus(marketError(payload)); if (response.status === 409) setRefreshKey((value) => value + 1); return; }
      setReceipt(payload.trade as Receipt);
      setStatus(side === "BUY" ? copy.trade.bought : copy.trade.sold);
      setRefreshKey((value) => value + 1);
      startTransition(() => router.refresh());
    } catch { setStatus(copy.trade.failed); }
    finally { setSubmitting(false); }
  }

  const busy = submitting || pending || quoteState === "loading";
  const executable = Boolean(signedQuote?.affordable) && Date.parse(signedQuote?.expiresAt ?? "") > Date.now();
  return <div className="exchange-panel bg-white p-5 sm:p-6"><div className="grid gap-5">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-[14px_4px_14px_4px] bg-[#ff4e72] text-white"><Ticket className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#e83c62]">ACG Exchange</p><h2 className="font-display text-2xl text-[#111827]">{copy.trade.title}</h2></div></div><span className="rounded-full bg-[#eef8f7] px-3 py-1 text-[10px] font-black uppercase tracking-[.15em] text-[#15777d]">System pool</span></div>
    <div className="grid grid-cols-2 rounded-[16px_4px_16px_4px] bg-[#f1ede4] p-1">{(["BUY", "SELL"] as const).map((entry) => <button key={entry} type="button" onClick={() => setSide(entry)} className={cn("flex items-center justify-center gap-2 rounded-[12px_3px_12px_3px] px-4 py-3 text-xs font-black", side === entry ? "bg-[#111827] text-white shadow" : "text-slate-500")}>{entry === "BUY" ? <ArrowUpFromLine className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}{entry === "BUY" ? copy.trade.buy : copy.trade.sell}</button>)}</div>
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px_5px_20px_5px] bg-[#263044] text-white [&>div]:bg-[#111827] [&>div]:p-4"><div><p className="text-[10px] uppercase tracking-[0.18em] text-white/50">{copy.trade.buyQuote}</p><p className="mt-1 text-2xl font-black">{currencyLabel(quote)}</p></div><div><p className="text-[10px] uppercase tracking-[0.18em] text-white/50">{copy.trade.sellQuote}</p><p className="mt-1 text-2xl font-black">{currencyLabel(sellQuote)}</p></div><div><p className="text-[10px] uppercase tracking-[0.18em] text-white/50">{copy.trade.balance}</p><p className="mt-1 text-lg font-black">{currencyLabel(balance)}</p></div><div><p className="text-[10px] uppercase tracking-[0.18em] text-white/50">{copy.trade.held}</p><p className="mt-1 text-lg font-black">{ownedUnits}</p></div></div>
    <label className="grid gap-2"><span className="text-xs font-black uppercase tracking-[.16em] text-slate-500">{copy.trade.quantity}</span><input type="number" min={1} max={25} value={quantity} onChange={(event) => setQuantity(Math.min(25, Math.max(1, Number(event.target.value) || 1)))} className="filter-field" /></label>
    {signedQuote ? <div className="rounded-[20px_5px_20px_5px] border border-black/8 bg-[#f8f5ed] p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#e83c62]">{zh ? "30 秒鎖定報價" : "30-second signed quote"}</p><span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400"><Clock3 className="h-3 w-3" />30s</span></div><div className="mt-4 grid grid-cols-2 gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">{zh ? "批量總額" : "Batch total"}</p><p className="mt-1 text-2xl font-black">{currencyLabel(signedQuote.total)}</p></div><div><p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">{zh ? "平均執行價" : "Average execution"}</p><p className="mt-1 text-2xl font-black">{currencyLabel(signedQuote.averagePrice)}</p></div></div><div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-500"><span>{signedQuote.firstPrice} → {signedQuote.lastPrice} SUP</span><span className="inline-flex items-center gap-1">{signedQuote.quoteBefore}<ArrowRight className="h-3 w-3" />{signedQuote.quoteAfter}</span></div></div> : <div className="grid min-h-28 place-items-center rounded-[20px_5px_20px_5px] bg-[#f8f5ed] text-xs font-bold text-slate-400">{quoteState === "loading" ? (zh ? "正在取得最新報價…" : "Requesting a fresh quote…") : (zh ? "無法取得報價" : "Quote unavailable")}</div>}
    {signedIn ? <button type="button" disabled={busy || !executable} onClick={submit} className="exchange-button-primary disabled:cursor-not-allowed disabled:opacity-45">{side === "BUY" ? <ArrowUpFromLine className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}{submitting ? (zh ? "執行中…" : "Executing…") : side === "BUY" ? copy.trade.buy : copy.trade.sell}</button> : <Link href="/api/auth/signin" className="exchange-button-primary">{copy.trade.signIn}</Link>}
    {receipt ? <div className="rounded-[18px_5px_18px_5px] bg-[#111827] p-4 text-white"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[#3ed6e0]"><ReceiptText className="h-4 w-4" />{zh ? "執行收據" : "Execution receipt"}</p><p className="mt-3 text-sm font-bold">{receipt.quantity} × {currencyLabel(receipt.averagePrice)} = {currencyLabel(receipt.total)}</p><p className="mt-1 text-xs text-white/45">#{receipt.id.slice(-10)} · {receipt.firstPrice} → {receipt.lastPrice} SUP</p></div> : null}
    <p className="text-xs leading-6 text-slate-500">{copy.trade.notice}</p>{status ? <p className="rounded-xl bg-[#eef8f4] px-4 py-3 text-sm font-bold text-[#23744b]" role="status">{status}</p> : null}
  </div></div>;
}
