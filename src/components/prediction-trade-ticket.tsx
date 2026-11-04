"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ActionDrawer } from "@/components/ui/action-drawer";
import { isDefinitiveTradeDecline, isPredictionQuote, isTradeReceipt, matchesDraft, quoteBlockReasons,
  type ConfirmedIntent, type OutcomeKey, type PredictionLocale, type PredictionQuote, type TradeDraft, type TradeReceipt } from "./prediction-trade-model";

interface TicketProps {
  marketSlug: string;
  signedIn: boolean;
  tradingOpen: boolean;
  outcomes: Array<{ key: OutcomeKey; probabilityBps: number }>;
  myPositions: Array<{ outcome: OutcomeKey; shares: number }>;
  locale: PredictionLocale;
  balance?: number;
  payoutPerShare?: number;
  userId?: string;
  initialOutcome?: OutcomeKey;
  marketVersion?: number;
}
const action = "inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4455C] disabled:cursor-not-allowed disabled:opacity-50";
const subscribeMobile = (callback: () => void) => {
  const media = window.matchMedia("(max-width: 1023px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const getMobile = () => window.matchMedia("(max-width: 1023px)").matches;
const getDesktop = () => false;

export function PredictionTradeTicket(props: TicketProps) {
  return <Ticket key={`${props.marketSlug}:${props.userId ?? props.signedIn}`} {...props} />;
}

function Ticket({ marketSlug, signedIn, tradingOpen, outcomes, myPositions, locale, balance, payoutPerShare = 100, userId, initialOutcome = "YES", marketVersion }: TicketProps) {
  const zh = locale === "zh-Hant";
  const router = useRouter();
  const mobile = useSyncExternalStore(subscribeMobile, getMobile, getDesktop);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<TradeDraft>({ outcome: initialOutcome, side: "BUY", quantity: 1 });
  const [quote, setQuote] = useState<PredictionQuote | null>(null);
  const [receipt, setReceipt] = useState<TradeReceipt | null>(null);
  const [pending, setPending] = useState<ConfirmedIntent | null>(null);
  const intentRef = useRef<ConfirmedIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "confirm" | null>(null);
  const inFlight = useRef(false);
  const request = useRef<{ sequence: number; controller?: AbortController }>({ sequence: 0 });
  const mounted = useRef(true);
  const [now, setNow] = useState(0);
  const [restored, setRestored] = useState(!userId);
  const [local, setLocal] = useState<{ balance?: number; positions: Partial<Record<OutcomeKey, number>>; yes?: number; version?: number }>({ positions: {} });
  const storageKey = userId ? `prediction-intent:v1:${encodeURIComponent(userId)}:${encodeURIComponent(marketSlug)}` : null;

  useEffect(() => {
    mounted.current = true;
    const previewRequest = request.current;
    // Hydrate account-scoped browser recovery data only after the server render.
    queueMicrotask(() => {
      if (!mounted.current || !storageKey) return;
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const intent = JSON.parse(saved) as ConfirmedIntent;
          if (typeof intent.key !== "string" || !intent.key || !isPredictionQuote(intent.quote)) throw new Error("Invalid recovery data");
          intentRef.current = intent;
          setPending(intent);
          setDraft({ outcome: intent.quote.outcome, side: intent.quote.side, quantity: intent.quote.quantity });
        }
        setRestored(true);
      } catch {
        setError(zh ? "無法讀取交易恢復資料。請保留此頁並檢查瀏覽器儲存權限，勿建立新交易。" : "Trade recovery data could not be read. Keep this page and check browser storage access before starting a new trade.");
      }
    });
    return () => { mounted.current = false; previewRequest.sequence += 1; previewRequest.controller?.abort(); };
  }, [storageKey, zh]);

  useEffect(() => {
    if (!quote) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [quote]);

  const useLocal = local.version === undefined || marketVersion === undefined || marketVersion < local.version;
  const shownBalance = (useLocal ? local.balance : undefined) ?? balance;
  const heldFor = (key: OutcomeKey) => (useLocal ? local.positions[key] : undefined) ?? myPositions.find((position) => position.outcome === key)?.shares ?? 0;
  const held = heldFor(draft.outcome);
  const totalHeld = heldFor("YES") + heldFor("NO");
  const probabilityFor = (key: OutcomeKey) => !useLocal || local.yes === undefined ? outcomes.find((entry) => entry.key === key)?.probabilityBps ?? 5_000 : key === "YES" ? local.yes : 10_000 - local.yes;
  const secondsLeft = quote ? Math.max(0, Math.ceil((Date.parse(quote.expiresAt) - now) / 1000)) : 0;
  const blocks = quote ? quoteBlockReasons(quote, shownBalance, totalHeld, locale) : [];
  const locked = Boolean(pending) || !restored;

  function editDraft(next: Partial<TradeDraft>) {
    if (intentRef.current || !restored) return;
    request.current.sequence += 1;
    request.current.controller?.abort();
    setBusy(null);
    setDraft((value) => ({ ...value, ...next }));
    setQuote(null);
    setError(null);
  }

  async function preview() {
    if (intentRef.current || inFlight.current || !restored || !tradingOpen || !signedIn) return;
    request.current.controller?.abort();
    const sequence = ++request.current.sequence;
    const controller = new AbortController();
    request.current.controller = controller;
    const requested = { ...draft };
    setBusy("preview"); setError(null); setQuote(null);
    try {
      const response = await fetch(`/api/predictions/${encodeURIComponent(marketSlug)}/quote`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requested), signal: controller.signal,
      });
      const payload: unknown = await response.json();
      if (!mounted.current || sequence !== request.current.sequence) return;
      if (!response.ok) throw new Error((payload as { error?: string }).error || (zh ? "無法取得報價，請重試。" : "A quote is unavailable. Please retry."));
      if (!isPredictionQuote(payload) || !matchesDraft(payload, requested)) throw new Error(zh ? "報價與選擇不符，請重新預覽。" : "The quote does not match your selection. Preview again.");
      setNow(Date.now()); setQuote(payload);
    } catch (caught) {
      if (mounted.current && sequence === request.current.sequence) setError(caught instanceof Error ? caught.message : zh ? "報價失敗，請重試。" : "Quote failed. Please retry.");
    } finally {
      if (mounted.current && sequence === request.current.sequence) setBusy(null);
    }
  }

  async function execute() {
    if (inFlight.current || !restored || !signedIn) return;
    let intent = intentRef.current;
    if (!intent) {
      if (!tradingOpen || !quote || !matchesDraft(quote, draft) || blocks.length || !quote.affordable) return;
      if (Date.parse(quote.expiresAt) <= Date.now()) { setNow(Date.now()); return; }
      intent = { key: crypto.randomUUID(), quote };
      try {
        if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify(intent));
      } catch {
        setError(zh ? "無法保存恢復資料，交易尚未送出。請開啟瀏覽器儲存權限後重試。" : "Recovery data could not be saved. No trade was sent. Enable browser storage and retry.");
        return;
      }
      intentRef.current = intent;
      setPending(intent);
      request.current.sequence += 1;
      request.current.controller?.abort();
    }
    inFlight.current = true;
    setBusy("confirm"); setError(null);
    const confirmed = intent;
    try {
      const response = await fetch(`/api/predictions/${encodeURIComponent(marketSlug)}/${confirmed.quote.side.toLowerCase()}`, {
        method: "POST", headers: { "content-type": "application/json", "idempotency-key": confirmed.key },
        body: JSON.stringify({ outcome: confirmed.quote.outcome, quantity: confirmed.quote.quantity, quoteToken: confirmed.quote.quoteToken }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const failure = payload as { error?: string; code?: string };
        if (isDefinitiveTradeDecline(response.status, failure.code)) {
          if (storageKey) sessionStorage.removeItem(storageKey);
          intentRef.current = null;
          if (mounted.current) { setPending(null); setQuote(null); setError(failure.error || (zh ? "交易未執行，請重新預覽。" : "Trade not executed. Preview again.")); }
          return;
        }
        throw new Error(failure.error);
      }
      if (!isTradeReceipt(payload, confirmed.quote)) throw new Error("Unrecognized receipt");
      if (storageKey) sessionStorage.removeItem(storageKey);
      intentRef.current = null;
      if (!mounted.current) return;
      setReceipt(payload); setPending(null); setQuote(null);
      setLocal((current) => ({ balance: payload.wallet.softBalance, positions: { ...(useLocal ? current.positions : {}), [payload.trade.outcome]: payload.position.shares },
        yes: payload.trade.outcome === "YES" ? payload.trade.probabilityAfterBps : 10_000 - payload.trade.probabilityAfterBps, version: payload.trade.marketVersion }));
      startTransition(() => router.refresh());
    } catch {
      if (mounted.current) setError(zh ? "結果尚未確認，交易可能已完成。請用下方按鈕查回同一筆結果；確認前不能更改或建立新交易。若登入已逾時，請重新登入同一帳戶再返回。" : "Result unknown: the trade may have completed. Recover the same result below; you cannot change or start a new trade until resolved. If your session expired, sign in to the same account and return.");
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(null);
    }
  }

  const form = <section aria-label={zh ? "預測交易" : "Prediction trade"} className="rounded-2xl border border-slate-200 bg-white p-5 text-[#222733] shadow-sm">
    <header className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{zh ? "你的預測" : "Your prediction"}</h2><p className="mt-1 text-xs text-[#606A78]">{zh ? "站內 SUP，無現金價值" : "Earned SUP, no cash value"}</p></div><div className="text-right text-xs text-[#606A78]">{zh ? "可用餘額" : "Available balance"}<strong className="mt-1 block text-base text-[#222733]">{shownBalance === undefined ? (zh ? "報價時檢查" : "Checked at preview") : `${shownBalance} SUP`}</strong></div></header>
    {receipt && <section aria-label={zh ? "成交回執" : "Trade receipt"} role="status" className="mt-4 rounded-xl border border-[#177B65]/30 bg-[#177B65]/5 p-4 text-sm">
      <div className="flex items-start justify-between gap-2"><h3 className="font-bold text-[#177B65]">{zh ? "交易已完成" : "Trade completed"}</h3><button type="button" className={`${action} -mr-2 -mt-2 text-[#606A78]`} onClick={() => setReceipt(null)} aria-label={zh ? "關閉成交回執" : "Dismiss trade receipt"}>{zh ? "關閉" : "Close"}</button></div>
      <p>{receipt.trade.side === "BUY" ? (zh ? "買入" : "Bought") : (zh ? "賣回" : "Sold")} {receipt.trade.quantity} {receipt.trade.outcome}</p>
      <p className="mt-2">{receipt.trade.side === "BUY" ? (zh ? "總支出（含費用）" : "Total cost (including fee)") : (zh ? "淨到帳（已扣費用）" : "Net proceeds (after fee)")}: {receipt.trade.netAmount} SUP</p>
      <p className="mt-1 text-xs text-[#606A78]">{zh ? "費用" : "Fee"}: {receipt.trade.feeAmount} SUP · {zh ? "更新後持倉" : "Updated holding"}: {receipt.position.shares} {receipt.trade.outcome} · {zh ? "餘額" : "Balance"}: {receipt.wallet.softBalance} SUP</p>
      <Link className={`${action} mt-2 text-[#C4455C]`} href={`/${locale}/me/predictions`}>{zh ? "查看交易記錄" : "View trade history"}</Link>
    </section>}
    {!signedIn ? <div className="mt-4"><p className="text-sm text-[#606A78]">{zh ? "登入後可預覽並參與預測。" : "Sign in to preview and join a prediction."}</p><Link href={`/${locale}/onboarding`} className={`${action} mt-3 w-full bg-[#C4455C] text-white`}>{zh ? "登入後參與" : "Sign in to join"}</Link></div> : <>
      {!tradingOpen && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-[#606A78]">{zh ? "交易已停止，仍可查看走勢、來源與結算進度。" : "Trading has stopped. History, sources and settlement progress remain available."}</p>}
      {(tradingOpen || pending) && <>
        <fieldset disabled={locked} className="mt-5"><legend className="text-xs font-semibold text-[#606A78]">{zh ? "選擇結果" : "Choose outcome"}</legend><div className="mt-2 grid grid-cols-2 gap-2">{(["YES", "NO"] as const).map((key) => <button type="button" key={key} aria-label={`${key} ${(probabilityFor(key) / 100).toFixed(1)}%`} aria-pressed={draft.outcome === key} onClick={() => editDraft({ outcome: key })} className={`${action} flex-col border py-3 ${draft.outcome === key ? key === "YES" ? "border-[#177B65] bg-[#177B65]/5 text-[#177B65]" : "border-[#B8495E] bg-[#B8495E]/5 text-[#B8495E]" : "border-slate-200 text-[#606A78]"}`}><span>{key}</span><strong className="text-2xl">{(probabilityFor(key) / 100).toFixed(1)}%</strong></button>)}</div></fieldset>
        <fieldset disabled={locked} className="mt-4"><legend className="sr-only">{zh ? "交易方向" : "Trade direction"}</legend><div className="grid grid-cols-2 gap-2">{(["BUY", "SELL"] as const).map((side) => <button type="button" key={side} aria-pressed={draft.side === side} onClick={() => editDraft({ side })} className={`${action} ${draft.side === side ? "bg-slate-800 text-white" : "bg-slate-100 text-[#606A78]"}`}>{side === "BUY" ? (zh ? "買入" : "Buy") : (zh ? "賣回" : "Sell")}</button>)}</div></fieldset>
        <fieldset disabled={locked} className="mt-4"><legend className="text-xs text-[#606A78]">{zh ? `份數 · 已持有 ${held} ${draft.outcome}` : `Shares · holding ${held} ${draft.outcome}`}</legend><div className="mt-2 flex gap-2">{[1, 2, 3].map((quantity) => <button type="button" key={quantity} aria-label={zh ? `${quantity} 份` : `${quantity} share${quantity === 1 ? "" : "s"}`} aria-pressed={draft.quantity === quantity} onClick={() => editDraft({ quantity })} className={`${action} min-w-11 border ${draft.quantity === quantity ? "border-[#C4455C] bg-[#C4455C]/5 text-[#C4455C]" : "border-slate-200"}`}>{quantity}</button>)}</div></fieldset>
        {quote && <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
          <p className="font-semibold">{quote.quantity} {quote.outcome} · {quote.side === "BUY" ? (zh ? "買入預覽" : "Buy preview") : (zh ? "賣回預覽" : "Sell preview")}</p>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2">
            <dt className="text-[#606A78]">{zh ? "交易金額（未計費用）" : "Gross amount (before fee)"}</dt><dd>{quote.grossAmount} SUP</dd>
            <dt className="text-[#606A78]">{quote.side === "BUY" ? (zh ? "加：費用" : "Plus: fee") : (zh ? "減：費用" : "Minus: fee")}</dt><dd>{quote.feeAmount} SUP</dd>
            <dt className="font-semibold">{quote.side === "BUY" ? (zh ? "總支出" : "Total cost") : (zh ? "淨到帳" : "Net proceeds")}</dt><dd className="font-bold">{quote.netAmount} SUP</dd>
            <dt className="text-[#606A78]">{zh ? "機率變化" : "Probability move"}</dt><dd>{(quote.probabilityBeforeBps / 100).toFixed(1)}% → {(quote.probabilityAfterBps / 100).toFixed(1)}%</dd>
          </dl>
          {quote.side === "BUY" && <p className="mt-3 text-xs leading-5 text-[#606A78]">{zh ? `本題持倉 ${quote.totalMarketPositionShares ?? totalHeld} / ${quote.limits.maxPositionShares} 份（YES + NO）。今日剩餘買入額度 ${quote.limits.dailyGrossBuyRemaining} SUP（不含費用，香港時間每日重設）。` : `Market holding ${quote.totalMarketPositionShares ?? totalHeld} / ${quote.limits.maxPositionShares} shares (YES + NO). Daily gross buy allowance remaining: ${quote.limits.dailyGrossBuyRemaining} SUP (fees excluded; resets daily in Hong Kong time).`}</p>}
          <p className="mt-3 text-xs text-[#606A78]">{secondsLeft > 0 ? (zh ? `報價剩餘 ${secondsLeft} 秒；確認時重新檢查。` : `Quote expires in ${secondsLeft}s; checked again at confirmation.`) : (zh ? "報價已過期，請重新預覽。" : "Quote expired. Preview again.")}</p>
          {blocks.length > 0 && <ul className="mt-3 space-y-2 text-sm text-[#B8495E]">{blocks.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
        </div>}
        <p className="mt-4 text-xs leading-5 text-[#606A78]">{zh ? `每份勝出結算 ${payoutPerShare} SUP；${draft.quantity} 份的勝出結算值為 ${draft.quantity * payoutPerShare} SUP。這是結算值，不是利潤，也不是保證回報。` : `Each winning share settles at ${payoutPerShare} SUP; ${draft.quantity} share(s) have a winning settlement value of ${draft.quantity * payoutPerShare} SUP. This is payout value, not profit or a guaranteed return.`}</p>
        {pending && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{zh ? "正在確認同一筆交易的結果。方向、份數及原報價已鎖定。" : "Confirming the same trade result. Direction, quantity and the original quote are locked."}</p>}
      </>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#B8495E]/5 p-3 text-sm leading-6 text-[#B8495E]">{error}</p>}
      {(tradingOpen || pending) && <button type="button" disabled={Boolean(busy) || !restored || (!pending && Boolean(quote && secondsLeft > 0 && blocks.length)) || (!pending && !quote && draft.side === "SELL" && held < draft.quantity)} onClick={pending ? execute : quote && secondsLeft > 0 ? execute : preview} className={`${action} mt-5 w-full bg-[#C4455C] text-white`}>
        {busy === "preview" ? (zh ? "取得報價中…" : "Loading preview…") : busy === "confirm" ? (zh ? "確認結果中…" : "Confirming result…") : pending ? (zh ? "查回同一筆結果" : "Recover same trade result") : quote && secondsLeft > 0 ? (zh ? `確認${draft.side === "BUY" ? "買入" : "賣回"}` : `Confirm ${draft.side.toLowerCase()}`) : quote ? (zh ? "更新報價" : "Refresh quote") : (zh ? "預覽交易" : "Preview trade")}
      </button>}
      {!pending && quote && <button type="button" disabled={Boolean(busy)} onClick={preview} className={`${action} mt-2 w-full text-[#606A78]`}>{zh ? "重新取得報價" : "Get a fresh quote"}</button>}
      {!pending && draft.side === "SELL" && held < draft.quantity && <p className="mt-2 text-xs text-[#B8495E]">{zh ? "持有份數不足。" : "Not enough shares held."}</p>}
    </>}
  </section>;
  if (!mobile) return form;
  return <>
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-sm"><button ref={triggerRef} type="button" aria-haspopup="dialog" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)} className={`${action} w-full bg-[#C4455C] text-white`}>{pending ? (zh ? "確認交易結果" : "Check trade result") : receipt ? (zh ? "查看成交回執" : "View trade receipt") : (zh ? "開啟預測交易" : "Open prediction trade")}</button></div>
    <ActionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={zh ? "預測交易" : "Prediction trade"} closeLabel={zh ? "關閉預測交易" : "Close prediction trade"} returnFocusRef={triggerRef}>{form}</ActionDrawer>
  </>;
}
