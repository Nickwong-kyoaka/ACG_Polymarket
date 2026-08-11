"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function RewardClaimPanel() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();

  async function claim(endpoint: "/api/rewards/check-in" | "/api/rewards/ad-claim") {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setStatus(null);
    const idempotencyKey = crypto.randomUUID();

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
      });
      const payload = await response.json();

      if (!response.ok) {
        setStatus(payload.error ?? "Reward claim failed.");
        return;
      }

      setStatus(
        endpoint === "/api/rewards/check-in"
          ? "Daily reward claimed."
          : "Rewarded ad payout received.",
      );
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || pending;

  return (
    <div className="grid gap-3 rounded-[1.75rem] border border-black/10 bg-[#fff9f2] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Reward loop
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => claim("/api/rewards/check-in")}
          className="rounded-full bg-[#db5d35] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#c14a24] disabled:opacity-60"
        >
          Claim daily check-in
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => claim("/api/rewards/ad-claim")}
          className="rounded-full border border-black/10 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#db5d35] hover:text-[#db5d35] disabled:opacity-60"
        >
          Claim ad reward
        </button>
      </div>
      {status ? <p className="text-sm font-medium text-slate-600">{status}</p> : null}
    </div>
  );
}
