"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Clock3, Coins, RadioTower } from "lucide-react";
import { pick, type PublicLocale } from "@/components/acg-locale";
import { roomRequest } from "@/components/room-ui";
import { useRoomMutationKeys } from "@/components/room-mutation-keys";
import { cn } from "@/lib/utils";
import type { WorkKind, WorkShiftView } from "@/lib/types";

const jobOptions = [
  { key: "SHIFT_30M", minutes: 30, reward: 10, tone: "from-[#ff6b7d] to-[#ff9f43]" },
  { key: "SHIFT_2H", minutes: 120, reward: 30, tone: "from-[#2d9da7] to-[#54d6c9]" },
  { key: "SHIFT_6H", minutes: 360, reward: 60, tone: "from-[#263c75] to-[#5297df]" },
] as const;
type DashboardShift = WorkShiftView & { dayKey?: string };
type WorkDashboard = { dayKey?: string; shifts: DashboardShift[]; earnedToday: number; dailyLimit: number };

export function WorkDesk({ locale, characters = [] }: { locale: PublicLocale; characters?: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<WorkDashboard | null>(null);
  const [characterId, setCharacterId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const keys = useRoomMutationKeys();

  useEffect(() => {
    const controller = new AbortController();
    roomRequest<WorkDashboard>("/api/jobs", { cache: "no-store", signal: controller.signal })
      .then((data) => { setDashboard(data); setNow(Date.now()); })
      .catch((error) => { if (!controller.signal.aborted) setStatus(error.message || pick(locale, "Could not restore your shift. Retry below.", "無法還原工作，請重試。")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [locale]);

  async function restore() {
    setLoading(true); setStatus(null);
    try { setDashboard(await roomRequest<WorkDashboard>("/api/jobs", { cache: "no-store" })); setNow(Date.now()); }
    catch (error) { setStatus(error instanceof Error ? error.message : pick(locale, "Could not restore your shift.", "無法還原工作。")); }
    finally { setLoading(false); }
  }

  function mutate(kind?: WorkKind, shiftId?: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    const action = shiftId ? `claim:${shiftId}` : `start:${kind}:${characterId}`;
    const idempotencyKey = keys.get(action);
    startTransition(async () => {
      setStatus(null);
      try {
        const payload = await roomRequest<DashboardShift | { shift: DashboardShift }>(shiftId ? `/api/jobs/${encodeURIComponent(shiftId)}/claim` : "/api/jobs/start", {
          method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
          body: JSON.stringify(shiftId ? { idempotencyKey } : { kind, characterId: characterId || undefined, idempotencyKey }),
        });
        const shift = "shift" in payload ? payload.shift : payload;
        if (!shift.id) throw new Error(pick(locale, "Could not read the shift. Restore before retrying.", "無法讀取工作，請先重新載入。"));
        setDashboard((previous) => previous ? { ...previous, earnedToday: previous.earnedToday + (shiftId ? shift.reward : 0), shifts: [shift, ...previous.shifts.filter((entry) => entry.id !== shift.id)] } : previous);
        keys.done(action); setNow(Date.now());
        setStatus(shiftId ? pick(locale, "SUP claimed. Your room balance is updated.", "已領取 SUP，房間餘額已更新。") : pick(locale, "Shift started. You can leave and return later.", "工作已開始，可以離開並稍後回來。"));
        router.refresh();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : pick(locale, "Network error. Retry safely with the same request.", "網絡錯誤，可以安全重試同一請求。"));
      } finally { inFlight.current = false; }
    });
  }

  const active = dashboard?.shifts.filter((shift) => shift.status === "ACTIVE" || shift.status === "READY") ?? [];
  const reserved = (dashboard?.earnedToday ?? 0) + active.reduce((sum, shift) => sum + shift.reward, 0);
  return <div className="grid gap-5 lg:grid-cols-3">
    <div className="exchange-panel grid gap-4 p-5 lg:col-span-3">
      <label className="grid gap-2 text-sm font-bold">{pick(locale, "Dispatch character (optional)", "派遣角色（可選）")}<select value={characterId} onChange={(event) => setCharacterId(event.target.value)} disabled={pending || active.length > 0} className="rounded-lg border border-black/15 bg-white p-3"><option value="">{pick(locale, "Room helper", "房間小幫手")}</option>{characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label>
      <p className="text-xs font-bold text-slate-500">{loading ? pick(locale, "Restoring shifts…", "正在還原工作…") : dashboard ? `${dashboard.earnedToday} / ${dashboard.dailyLimit} SUP ${pick(locale, "earned today · Hong Kong time", "今日收入 · 香港時間")}` : pick(locale, "Restore your shifts before starting a new one.", "開始新工作前，請先還原現有工作。")}</p>
      <button type="button" onClick={restore} disabled={loading || pending} className="exchange-button-secondary w-fit disabled:opacity-50">{pick(locale, "Refresh shifts", "重新載入工作")}</button>
    </div>
    {active.map((shift) => {
      const remaining = Math.max(0, Math.ceil((Date.parse(shift.endsAt) - now) / 1000));
      const ready = shift.status === "READY" || remaining === 0;
      return <article key={shift.id} className="exchange-panel bg-[#111827] p-6 text-white lg:col-span-3"><p className="font-bold">{characters.find((character) => character.id === shift.characterId)?.name ?? pick(locale, "Room helper", "房間小幫手")} · +{shift.reward} SUP</p><p role="timer" className="my-4 font-display text-4xl">{ready ? pick(locale, "Ready to claim", "可以領取") : `${String(Math.floor(remaining / 3600)).padStart(2, "0")}:${String(Math.floor(remaining / 60) % 60).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`}</p><button type="button" disabled={!ready || pending || loading} onClick={() => mutate(undefined, shift.id)} className="exchange-button-primary disabled:opacity-50">{pick(locale, "Claim shift reward", "領取打工獎勵")}</button></article>;
    })}
    {jobOptions.map((job, index) => <article key={job.key} className={cn("work-duration exchange-panel bg-gradient-to-br p-6 text-white", job.tone)}><div className="relative z-10 flex min-h-72 flex-col"><div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-[16px_4px_16px_4px] bg-white/16"><BriefcaseBusiness className="h-6 w-6" /></span><span className="text-5xl font-black text-white/20">0{index + 1}</span></div><p className="mt-8 text-[10px] font-black uppercase tracking-[.22em] text-white/65">{pick(locale, "Character dispatch", "角色派遣")}</p><h3 className="mt-2 font-display text-3xl">{job.minutes < 60 ? pick(locale, "Signal sorting", "訊號整理") : job.minutes < 300 ? pick(locale, "Booth support", "攤位支援") : pick(locale, "Night archive", "深夜檔案工作")}</h3><div className="my-5 flex gap-4 text-sm font-bold"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{job.minutes < 60 ? `${job.minutes}m` : `${job.minutes / 60}h`}</span><span className="inline-flex items-center gap-2"><Coins className="h-4 w-4" />+{job.reward} SUP</span></div><button type="button" onClick={() => mutate(job.key)} disabled={pending || loading || !dashboard || active.length > 0 || reserved + job.reward > dashboard.dailyLimit} className="mt-auto inline-flex items-center justify-center gap-2 rounded-[15px_4px_15px_4px] bg-[#111827] px-5 py-3 text-sm font-black text-white transition hover:bg-white hover:text-[#111827] disabled:opacity-55"><RadioTower className="h-4 w-4" />{active.length ? pick(locale, "Shift active", "工作進行中") : pick(locale, "Start shift", "開始工作")}</button></div></article>)}
    {status ? <p role="status" className="exchange-panel bg-white/80 p-4 text-sm leading-7 text-slate-600 lg:col-span-3">{status}</p> : null}
  </div>;
}
