"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { currencyLabel } from "@/lib/utils";

export function SupportTradePanel({
  characterId,
  quote,
  sellQuote,
  balance,
  ownedUnits,
}: {
  characterId: string;
  quote: number;
  sellQuote: number;
  balance: number;
  ownedUnits: number;
}) {
  const router = useRouter();
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
        setStatus(payload.error ?? "Trade failed.");
        return;
      }

      setStatus(side === "buy" ? "Support units added." : "Support units sold back.");
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || pending;

  return (
    <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.5)]">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 rounded-[1.5rem] bg-slate-950 p-4 text-white">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Buy quote</p>
            <p className="text-2xl font-semibold">{currencyLabel(quote)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Sell quote</p>
            <p className="text-2xl font-semibold">{currencyLabel(sellQuote)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Your balance</p>
            <p className="text-lg font-semibold">{currencyLabel(balance)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Held units</p>
            <p className="text-lg font-semibold">{ownedUnits}</p>
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Units</span>
          <input
            type="number"
            min={1}
            max={25}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="rounded-2xl border border-black/10 bg-[#fff9f2] px-4 py-3 text-slate-900 outline-none ring-[#db5d35] transition focus:ring-2"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => submit("buy")}
            className="rounded-full bg-[#db5d35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c14a24] disabled:opacity-60"
          >
            Buy support
          </button>
          <button
            type="button"
            disabled={busy || ownedUnits < quantity}
            onClick={() => submit("sell")}
            className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#db5d35] hover:text-[#db5d35] disabled:opacity-50"
          >
            Sell back
          </button>
        </div>

        <p className="text-xs leading-6 text-slate-500">
          This is a positive-only support market. There is no shorting, no player-to-player order
          book, and no cash-out.
        </p>
        {status ? <p className="text-sm font-medium text-[#23744b]">{status}</p> : null}
      </div>
    </div>
  );
}
