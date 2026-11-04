"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarHeart, PlayCircle } from "lucide-react";
import { getExchangeCopy, pick, type PublicLocale } from "@/components/acg-locale";
import { roomRequest } from "@/components/room-ui";
import { useRoomMutationKeys } from "@/components/room-mutation-keys";

type AdSession = { nonce: string; slot: number; provider: string; expiresAt: string; readyAt: number; key: string };

export function RewardClaimPanel({ locale = "en" }: { locale?: PublicLocale }) {
  const router = useRouter();
  const copy = getExchangeCopy(locale);
  const [status, setStatus] = useState<string | null>(null);
  const [session, setSession] = useState<AdSession | null>(null);
  const [now, setNow] = useState(0);
  const [pending, startTransition] = useTransition();
  const locked = useRef(false);
  const keys = useRoomMutationKeys();

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [session]);

  function run(action: "daily" | "start" | "complete") {
    if (locked.current) return;
    locked.current = true;
    startTransition(async () => {
      setStatus(null);
      try {
        if (action === "start") {
          const result = await roomRequest<Omit<AdSession, "readyAt" | "key">>("/api/rewards/ad/start", { method: "POST" });
          if (result.provider !== "mock") throw new Error(pick(locale, "This ad provider is not connected yet.", "這個廣告供應商尚未接通。"));
          setSession({ ...result, readyAt: Date.now() + 5000, key: crypto.randomUUID() });
          setNow(Date.now());
        } else {
          if (action === "complete" && (!session || now < session.readyAt || Date.now() >= Date.parse(session.expiresAt))) return;
          const idempotencyKey = action === "daily" ? keys.get("daily") : session!.key;
          await roomRequest(action === "daily" ? "/api/rewards/check-in" : "/api/rewards/ad/complete", {
            method: "POST", headers: { "Idempotency-Key": idempotencyKey, ...(action === "complete" ? { "Content-Type": "application/json" } : {}) },
            ...(action === "complete" ? { body: JSON.stringify({ nonce: session!.nonce, idempotencyKey }) } : {}),
          });
          if (action === "daily") keys.done("daily");
          if (action === "complete") setSession(null);
          setStatus(action === "daily" ? copy.rewards.dailyDone : copy.rewards.adDone);
          router.refresh();
        }
      } catch (error) { setStatus(error instanceof Error ? error.message : copy.rewards.failed); }
      finally { locked.current = false; }
    });
  }

  const expired = session ? now >= Date.parse(session.expiresAt) : false;
  const seconds = session ? Math.max(0, Math.ceil((session.readyAt - now) / 1000)) : 0;
  return <div className="grid gap-4 border border-black bg-[#182033] p-5 text-white">
    <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffcc66]">SUP ENERGY LOOP</p><h3 className="mt-2 font-display text-2xl">{copy.rewards.title}</h3></div>
    <div className="grid grid-cols-2 gap-3"><button type="button" disabled={pending} onClick={() => run("daily")} className="exchange-button-primary px-3 disabled:opacity-60"><CalendarHeart className="h-4 w-4" />{copy.rewards.daily}</button><button type="button" disabled={pending || Boolean(session && !expired)} onClick={() => run("start")} className="inline-flex items-center justify-center gap-2 border border-white/30 px-3 py-3 text-xs font-black text-white transition hover:bg-white/10 disabled:opacity-60"><PlayCircle className="h-4 w-4" />{copy.rewards.ad}</button></div>
    {session ? <div className="grid gap-3 border border-white/15 p-4"><p className="text-xs leading-6">{pick(locale, "Mock ad preview · no real advertisement. Slot", "模擬廣告預覽 · 非真實廣告。時段")} {session.slot}</p><p role="timer" className="text-sm">{expired ? pick(locale, "Session expired. Start a new preview.", "流程已過期，請重新開始預覽。") : seconds ? pick(locale, `Mock playback · ${seconds}s remaining`, `模擬播放 · 剩餘 ${seconds} 秒`) : pick(locale, "Mock playback finished. Confirm to collect.", "模擬播放完成，確認後領取。")}</p><button type="button" onClick={() => run("complete")} disabled={pending || seconds > 0 || expired} className="exchange-button-primary disabled:opacity-50">{pick(locale, "Complete mock ad", "完成模擬廣告")}</button></div> : null}
    {status ? <p role="status" className="text-sm font-medium text-white/70">{status}</p> : null}
  </div>;
}
