"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getCopy, type Locale } from "@/lib/i18n";
import { currencyLabel } from "@/lib/utils";

export function SupportTradePanel({
  characterId,
  quote,
  sellQuote,
  balance,
  ownedUnits,
  locale = "en",
}: {
  characterId: string;
  quote: number;
  sellQuote: number;
  balance: number;
  ownedUnits: number;
  locale?: Locale;
}) {
  const router = useRouter();
  const copy = getCopy(locale);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();

  async function submit(side: "buy" | "sell") {
    if (submitting) {
      return;
    }

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

      setStatus(side === "buy" ? copy.trade.buyDone : copy.trade.sellDone);
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || pending;

  return (
    <div className="rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.5)]">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 rounded-[1.5rem] bg-[#171126] p-4 text-white">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
              {copy.trade.buyQuote}
            </p>
            <p className="text-2xl font-semibold">{currencyLabel(quote)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
              {copy.trade.sellQuote}
            </p>
            <p className="text-2xl font-semibold">{currencyLabel(sellQuote)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
              {copy.trade.balance}
            </p>
            <p className="text-lg font-semibold">{currencyLabel(balance)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
              {copy.trade.heldUnits}
            </p>
            <p className="text-lg font-semibold">{ownedUnits}</p>
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">{copy.trade.quantity}</span>
          <input
            type="number"
            min={1}
            max={25}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="rounded-2xl border border-black/10 bg-[#fff8ed] px-4 py-3 text-slate-900 outline-none ring-[#ff3d7f] transition focus:ring-2"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => submit("buy")}
            className="rounded-full bg-[#ff3d7f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#e32369] disabled:opacity-60"
          >
            {copy.trade.buy}
          </button>
          <button
            type="button"
            disabled={busy || ownedUnits < quantity}
            onClick={() => submit("sell")}
            className="rounded-full border border-black/10 px-5 py-3 text-sm font-black text-slate-700 transition hover:border-[#ff3d7f] hover:text-[#ff3d7f] disabled:opacity-50"
          >
            {copy.trade.sell}
          </button>
        </div>

        <p className="text-xs leading-6 text-slate-500">{copy.trade.notice}</p>
        {status ? <p className="text-sm font-bold text-[#23744b]">{status}</p> : null}
      </div>
    </div>
  );
}
