"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Ticket } from "lucide-react";
import { getExchangeCopy, type PublicLocale } from "@/components/acg-locale";
import { currencyLabel } from "@/lib/utils";

export type SupportTradePanelProps = {
  characterId: string;
  quote: number;
  sellQuote: number;
  balance: number;
  ownedUnits: number;
  locale?: PublicLocale;
  signedIn?: boolean;
};

export function SupportTradePanel({
  characterId,
  quote,
  sellQuote,
  balance,
  ownedUnits,
  locale = "en",
  signedIn = true,
}: SupportTradePanelProps) {
  const router = useRouter();
  const copy = getExchangeCopy(locale);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();

  async function submit(side: "buy" | "sell") {
    if (submitting) return;
    setStatus(null);
    setSubmitting(true);
    const idempotencyKey = crypto.randomUUID();

    try {
      const response = await fetch(`/api/characters/${characterId}/${side}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ quantity, idempotencyKey }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error ?? copy.trade.failed);
        return;
      }
      setStatus(side === "buy" ? copy.trade.bought : copy.trade.sold);
      startTransition(() => router.refresh());
    } catch {
      setStatus(copy.trade.failed);
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || pending;

  return (
    <div className="exchange-panel bg-white p-5 sm:p-6">
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[14px_4px_14px_4px] bg-[#ff4e72] text-white"><Ticket className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#e83c62]">ACG Exchange</p>
              <h2 className="font-display text-2xl text-[#111827]">{copy.trade.title}</h2>
            </div>
          </div>
          <span className="rounded-full bg-[#eef8f7] px-3 py-1 text-[10px] font-black uppercase tracking-[.15em] text-[#15777d]">System pool</span>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px_5px_20px_5px] bg-[#263044] text-white [&>div]:bg-[#111827] [&>div]:p-4">
          <div><p className="text-[10px] uppercase tracking-[0.18em] text-white/50">{copy.trade.buyQuote}</p><p className="mt-1 text-2xl font-black">{currencyLabel(quote)}</p></div>
          <div><p className="text-[10px] uppercase tracking-[0.18em] text-white/50">{copy.trade.sellQuote}</p><p className="mt-1 text-2xl font-black">{currencyLabel(sellQuote)}</p></div>
          <div><p className="text-[10px] uppercase tracking-[0.18em] text-white/50">{copy.trade.balance}</p><p className="mt-1 text-lg font-black">{currencyLabel(balance)}</p></div>
          <div><p className="text-[10px] uppercase tracking-[0.18em] text-white/50">{copy.trade.held}</p><p className="mt-1 text-lg font-black">{ownedUnits}</p></div>
        </div>

        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[.16em] text-slate-500">{copy.trade.quantity}</span>
          <input type="number" min={1} max={25} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} className="filter-field" />
        </label>

        {signedIn ? (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" disabled={busy} onClick={() => submit("buy")} className="exchange-button-primary disabled:opacity-60"><ArrowUpFromLine className="h-4 w-4" />{copy.trade.buy}</button>
            <button type="button" disabled={busy || ownedUnits < quantity} onClick={() => submit("sell")} className="exchange-button-secondary disabled:opacity-50"><ArrowDownToLine className="h-4 w-4" />{copy.trade.sell}</button>
          </div>
        ) : <Link href="/api/auth/signin" className="exchange-button-primary">{copy.trade.signIn}</Link>}

        <p className="text-xs leading-6 text-slate-500">{copy.trade.notice}</p>
        {status ? <p className="rounded-xl bg-[#eef8f4] px-4 py-3 text-sm font-bold text-[#23744b]">{status}</p> : null}
      </div>
    </div>
  );
}
