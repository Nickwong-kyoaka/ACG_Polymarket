"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarHeart, PlayCircle } from "lucide-react";
import { getExchangeCopy, type PublicLocale } from "@/components/acg-locale";

export function RewardClaimPanel({ locale = "en" }: { locale?: PublicLocale }) {
  const router = useRouter();
  const copy = getExchangeCopy(locale);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();

  async function claim(endpoint: "/api/rewards/check-in" | "/api/rewards/ad-claim") {
    if (submitting) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error ?? copy.rewards.failed);
        return;
      }
      setStatus(endpoint === "/api/rewards/check-in" ? copy.rewards.dailyDone : copy.rewards.adDone);
      startTransition(() => router.refresh());
    } catch {
      setStatus(copy.rewards.failed);
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || pending;
  return (
    <div className="grid gap-4 rounded-[22px_5px_22px_5px] bg-[#111827] p-5 text-white">
      <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffcc66]">SUP ENERGY LOOP</p><h3 className="mt-2 font-display text-2xl">{copy.rewards.title}</h3></div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" disabled={busy} onClick={() => claim("/api/rewards/check-in")} className="exchange-button-primary px-3 disabled:opacity-60"><CalendarHeart className="h-4 w-4" />{copy.rewards.daily}</button>
        <button type="button" disabled={busy} onClick={() => claim("/api/rewards/ad-claim")} className="inline-flex items-center justify-center gap-2 rounded-[14px_4px_14px_4px] border border-white/15 px-3 py-3 text-xs font-black text-white transition hover:bg-white/10 disabled:opacity-60"><PlayCircle className="h-4 w-4" />{copy.rewards.ad}</button>
      </div>
      {status ? <p className="text-sm font-medium text-white/70">{status}</p> : null}
    </div>
  );
}
