"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, LoaderCircle, RotateCcw } from "lucide-react";

type OutcomeKey = "YES" | "NO";
type TradeSide = "BUY" | "SELL";

interface PredictionQuote {
  quoteToken: string;
  expiresAt: string;
  outcome: OutcomeKey;
  side: TradeSide;
  quantity: number;
  probabilityBeforeBps: number;
  probabilityAfterBps: number;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  affordable: boolean;
  positionShares: number;
  limits: {
    maxPositionShares: number;
    dailyGrossBuyRemaining: number;
  };
}

interface TradeReceipt {
  trade: {
    outcome: OutcomeKey;
    side: TradeSide;
    quantity: number;
    netAmount: number;
    probabilityAfterBps: number;
  };
  wallet: { softBalance: number };
  position: { shares: number };
}

export function PredictionTradeTicket({
  marketSlug,
  signedIn,
  tradingOpen,
  outcomes,
  myPositions,
  locale,
}: {
  marketSlug: string;
  signedIn: boolean;
  tradingOpen: boolean;
  outcomes: Array<{ key: OutcomeKey; probabilityBps: number }>;
  myPositions: Array<{ outcome: OutcomeKey; shares: number }>;
  locale: "en" | "zh-Hant";
}) {
  const zh = locale === "zh-Hant";
  const [outcome, setOutcome] = useState<OutcomeKey>("YES");
  const [side, setSide] = useState<TradeSide>("BUY");
  const [quantity, setQuantity] = useState(1);
  const [quote, setQuote] = useState<PredictionQuote | null>(null);
  const [receipt, setReceipt] = useState<TradeReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!quote) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(quote.expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [quote]);

  function resetQuote(next?: { outcome?: OutcomeKey; side?: TradeSide; quantity?: number }) {
    if (next?.outcome) setOutcome(next.outcome);
    if (next?.side) setSide(next.side);
    if (next?.quantity) setQuantity(next.quantity);
    setQuote(null);
    setReceipt(null);
    setError(null);
  }

  async function readResponse(response: Response) {
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : zh ? "操作未完成，請再試一次。" : "The request could not be completed.");
    return payload;
  }

  async function preview() {
    setBusy(true);
    setError(null);
    setReceipt(null);
    try {
      const response = await fetch(`/api/predictions/${encodeURIComponent(marketSlug)}/quote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outcome, side, quantity }),
      });
      setQuote((await readResponse(response)) as unknown as PredictionQuote);
    } catch (caught) {
      setQuote(null);
      setError(caught instanceof Error ? caught.message : zh ? "報價暫時未能取得。" : "A quote is not available right now.");
    } finally {
      setBusy(false);
    }
  }

  async function execute() {
    if (!quote || secondsLeft <= 0) return preview();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/predictions/${encodeURIComponent(marketSlug)}/${side.toLowerCase()}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ outcome, quantity, quoteToken: quote.quoteToken }),
      });
      const nextReceipt = (await readResponse(response)) as unknown as TradeReceipt;
      setReceipt(nextReceipt);
      setQuote(null);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : zh ? "交易未完成，請重新報價。" : "The trade did not complete. Request a fresh quote.");
    } finally {
      setBusy(false);
    }
  }

  const probability = outcomes.find((entry) => entry.key === outcome)?.probabilityBps ?? 5_000;
  const held = myPositions.find((entry) => entry.outcome === outcome)?.shares ?? 0;

  if (!signedIn) {
    return (
      <div className="border border-[#2c2724] bg-[#fffaf4] p-5 shadow-[6px_7px_0_rgba(44,39,36,.12)]">
        <p className="font-display text-2xl">{zh ? "先拿一本自己的預測票簿" : "Start your own prediction ticket book"}</p>
        <p className="mt-3 text-sm leading-7 text-[#716862]">{zh ? "登入後可用站內賺到的 SUP 參與。每張票都會保存當時的機率與來源規則。" : "Sign in to participate with SUP earned on the site. Every ticket keeps the probability and source rules from that moment."}</p>
        <Link href={`/${locale}/onboarding`} className="exchange-button-primary mt-5">{zh ? "登入後參與" : "Sign in to join"}<ArrowRight className="h-4 w-4" /></Link>
      </div>
    );
  }

  if (!tradingOpen) {
    return <div className="border border-[#2c2724] bg-[#efe4d5] p-5"><p className="font-display text-2xl">{zh ? "這張預測票已停止交易" : "This prediction ticket is no longer trading"}</p><p className="mt-2 text-sm text-[#716862]">{zh ? "目前仍可查看來源、歷史與結算進度。" : "Its sources, history, and resolution progress remain available."}</p></div>;
  }

  return (
    <div className="border border-[#2c2724] bg-[#f2ca61] p-1 shadow-[8px_9px_0_#2c2724]">
      <div className="border border-dashed border-[#2c2724]/60 bg-[#fffaf4] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[.17em] text-[#9a4c4a]">SUP TICKET DESK</p><h2 className="mt-2 font-display text-2xl">{zh ? "選擇你的判斷" : "Choose your read"}</h2></div>
          <span className="text-right text-[10px] font-black text-[#716862]">{zh ? "目前持有" : "HELD"}<br /><strong className="text-base text-[#2c2724]">{held}</strong></span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {(["YES", "NO"] as const).map((key) => {
            const chance = outcomes.find((entry) => entry.key === key)?.probabilityBps ?? 5_000;
            return <button key={key} type="button" onClick={() => resetQuote({ outcome: key })} className={`border p-4 text-left transition ${outcome === key ? key === "YES" ? "border-[#356e66] bg-[#dceae4] shadow-[3px_3px_0_#356e66]" : "border-[#a15154] bg-[#f1d9d6] shadow-[3px_3px_0_#a15154]" : "border-[#2c2724]/25 bg-white hover:border-[#2c2724]"}`}>
              <span className="text-[10px] font-black tracking-[.13em]">{key}</span><strong className="mt-1 block font-display text-3xl">{(chance / 100).toFixed(0)}%</strong>
            </button>;
          })}
        </div>

        <div className="mt-5 grid grid-cols-2 border border-[#2c2724]">
          {(["BUY", "SELL"] as const).map((value) => <button key={value} type="button" onClick={() => resetQuote({ side: value })} className={`px-3 py-2 text-xs font-black ${side === value ? "bg-[#2c2724] text-white" : "bg-white text-[#716862]"}`}>{value === "BUY" ? (zh ? "加入判斷" : "ADD") : (zh ? "減少持有" : "REDUCE")}</button>)}
        </div>

        <div className="mt-5 flex items-center justify-between border-y border-[#2c2724]/20 py-4">
          <span className="text-xs font-black">{zh ? "份數" : "SHARES"}</span>
          <div className="flex gap-2">{[1, 2, 3].map((value) => <button key={value} type="button" onClick={() => resetQuote({ quantity: value })} className={`grid h-9 w-9 place-items-center border text-sm font-black ${quantity === value ? "border-[#2c2724] bg-[#f2ca61]" : "border-[#2c2724]/25 bg-white"}`}>{value}</button>)}</div>
        </div>

        {quote ? <div className="mt-5 bg-[#283338] p-4 text-white">
          <div className="flex justify-between gap-4"><span className="text-xs text-white/55">{zh ? "機率變化" : "Probability move"}</span><strong>{(quote.probabilityBeforeBps / 100).toFixed(1)}% → {(quote.probabilityAfterBps / 100).toFixed(1)}%</strong></div>
          <div className="mt-2 flex justify-between gap-4"><span className="text-xs text-white/55">{zh ? "票面金額" : "Ticket amount"}</span><strong>{quote.netAmount} SUP</strong></div>
          <div className="mt-2 flex justify-between gap-4"><span className="text-xs text-white/55">{zh ? "其中站內費用" : "Includes site fee"}</span><strong>{quote.feeAmount} SUP</strong></div>
          <p className="mt-3 border-t border-white/15 pt-3 text-[10px] text-white/55">{secondsLeft > 0 ? (zh ? `報價保留 ${secondsLeft} 秒` : `Quote held for ${secondsLeft}s`) : (zh ? "報價已過期，按下方重新取得。" : "Quote expired. Refresh it below.")}</p>
        </div> : null}

        {receipt ? <div className="mt-5 flex items-start gap-3 border border-[#356e66] bg-[#e4f0eb] p-4 text-sm text-[#234c46]"><Check className="mt-0.5 h-4 w-4 shrink-0" /><span>{zh ? `${receipt.trade.quantity} 份 ${receipt.trade.outcome} 已記進票簿，餘額 ${receipt.wallet.softBalance} SUP。` : `${receipt.trade.quantity} ${receipt.trade.outcome} share(s) entered in your ticket book. ${receipt.wallet.softBalance} SUP remains.`}</span></div> : null}
        {error ? <p role="alert" className="mt-4 border-l-3 border-[#a15154] bg-[#f6e6e2] px-3 py-2 text-xs leading-5 text-[#873f43]">{error}</p> : null}

        <button type="button" disabled={busy || Boolean(receipt) || (side === "SELL" && held < quantity)} onClick={quote ? execute : preview} className="exchange-button-primary mt-5 w-full disabled:opacity-45">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : quote && secondsLeft <= 0 ? <RotateCcw className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          {quote ? (secondsLeft > 0 ? (zh ? `確認 ${side === "BUY" ? "加入" : "減少"}` : `Confirm ${side.toLowerCase()}`) : (zh ? "重新報價" : "Refresh quote")) : (zh ? `預覽 ${outcome} · ${(probability / 100).toFixed(0)}%` : `Preview ${outcome} · ${(probability / 100).toFixed(0)}%`)}
        </button>
      </div>
    </div>
  );
}
