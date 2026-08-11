"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getCopy, type Locale } from "@/lib/i18n";

export function RewardClaimPanel({ locale = "en" }: { locale?: Locale }) {
  const router = useRouter();
  const copy = getCopy(locale);
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
        setStatus(payload.error ?? copy.rewards.failed);
        return;
      }

      setStatus(
        endpoint === "/api/rewards/check-in"
          ? copy.rewards.dailyDone
          : copy.rewards.adDone,
      );
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || pending;

  return (
    <div className="grid gap-3 rounded-[1.75rem] border border-black/10 bg-[#fff8ed] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {copy.rewards.loop}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => claim("/api/rewards/check-in")}
          className="rounded-full bg-[#ff3d7f] px-4 py-3 text-sm font-black text-white transition hover:bg-[#e32369] disabled:opacity-60"
        >
          {copy.rewards.daily}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => claim("/api/rewards/ad-claim")}
          className="rounded-full border border-black/10 px-4 py-3 text-sm font-black text-slate-700 transition hover:border-[#ff3d7f] hover:text-[#ff3d7f] disabled:opacity-60"
        >
          {copy.rewards.ad}
        </button>
      </div>
      {status ? <p className="text-sm font-medium text-slate-600">{status}</p> : null}
    </div>
  );
}
