"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bookmark, Check, Heart, Sparkles } from "lucide-react";
import type { DailyMissionView } from "@/lib/types";

const icons = { COMFORT_SESSION: Sparkles, POSITIVE_REACTION: Heart, SUPPORT_OR_WATCH: Bookmark } as const;

export function MissionPanel({ missions, locale }: { missions: DailyMissionView[]; locale: "en" | "zh-Hant" }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  async function claim(key: string) {
    setBusy(key); setMessage(null);
    const idempotencyKey = crypto.randomUUID();
    const response = await fetch(`/api/missions/${key}/claim`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ idempotencyKey }) });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? (locale === "zh-Hant" ? "任務 SUP 已加入錢包。" : "Mission SUP added to your wallet.") : payload.error ?? (locale === "zh-Hant" ? "暫時無法領取。" : "Could not claim this mission."));
    setBusy(null); if (response.ok) startTransition(() => router.refresh());
  }
  return <div className="grid gap-3">{missions.map((mission) => { const Icon = icons[mission.key]; return <div key={mission.key} className="flex items-center gap-4 rounded-[18px_5px_18px_5px] border border-black/8 bg-[#f5f1e8] p-4"><span className="mission-check">{mission.completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800">{mission.title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{mission.description}</p></div>{mission.completed && !mission.claimed ? <button type="button" onClick={() => claim(mission.key)} disabled={Boolean(busy) || pending} className="exchange-button-primary px-3 py-2 text-[10px]">+{mission.reward}</button> : <span className="text-xs font-black text-[#19757a]">{mission.claimed ? (locale === "zh-Hant" ? "已領取" : "CLAIMED") : `+${mission.reward}`}</span>}</div>; })}{message ? <p className="text-sm font-bold text-[#19757a]" role="status">{message}</p> : null}</div>;
}
