"use client";

import { useState, useTransition } from "react";
import { BriefcaseBusiness, Clock3, Coins, RadioTower } from "lucide-react";
import { pick, type PublicLocale } from "@/components/acg-locale";
import { cn } from "@/lib/utils";

const jobOptions = [
  { key: "QUICK", minutes: 30, reward: 10, tone: "from-[#ff6b7d] to-[#ff9f43]" },
  { key: "STANDARD", minutes: 120, reward: 30, tone: "from-[#2d9da7] to-[#54d6c9]" },
  { key: "DEEP", minutes: 360, reward: 60, tone: "from-[#263c75] to-[#5297df]" },
] as const;

export function WorkDesk({ locale }: { locale: PublicLocale }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startJob(jobType: string) {
    startTransition(async () => {
      setStatus(null);
      try {
        const response = await fetch("/api/jobs/start", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ jobType }) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setStatus(response.status === 404 ? pick(locale, "The work service is waiting for the domain endpoint.", "打工介面已就緒，正等待後端打工服務接通。") : payload.error ?? pick(locale, "Could not start this shift.", "暫時無法開始這份工作。"));
          return;
        }
        setActiveKey(payload.job?.id ?? jobType);
        setStatus(pick(locale, "Shift started. Return when the timer completes to claim SUP.", "工作已開始，倒數完成後回來領取 SUP。"));
      } catch {
        setStatus(pick(locale, "The work service is not connected yet.", "打工服務尚未接通。"));
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {jobOptions.map((job, index) => (
        <article key={job.key} className={cn("work-duration exchange-panel bg-gradient-to-br p-6 text-white", job.tone)}>
          <div className="relative z-10 flex min-h-72 flex-col">
            <div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-[16px_4px_16px_4px] bg-white/16"><BriefcaseBusiness className="h-6 w-6" /></span><span className="text-5xl font-black text-white/20">0{index + 1}</span></div>
            <p className="mt-8 text-[10px] font-black uppercase tracking-[.22em] text-white/65">{pick(locale, "Character dispatch", "角色派遣")}</p>
            <h3 className="mt-2 font-display text-3xl">{job.minutes < 60 ? pick(locale, "Signal sorting", "訊號整理") : job.minutes < 300 ? pick(locale, "Booth support", "攤位支援") : pick(locale, "Night archive", "深夜檔案工作")}</h3>
            <div className="mt-5 flex gap-4 text-sm font-bold"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{job.minutes < 60 ? `${job.minutes}m` : `${job.minutes / 60}h`}</span><span className="inline-flex items-center gap-2"><Coins className="h-4 w-4" />+{job.reward} SUP</span></div>
            <button type="button" onClick={() => startJob(job.key)} disabled={pending || activeKey !== null} className="mt-auto inline-flex items-center justify-center gap-2 rounded-[15px_4px_15px_4px] bg-[#111827] px-5 py-3 text-sm font-black text-white transition hover:bg-white hover:text-[#111827] disabled:opacity-55"><RadioTower className="h-4 w-4" />{activeKey ? pick(locale, "Shift active", "工作進行中") : pick(locale, "Start shift", "開始工作")}</button>
          </div>
        </article>
      ))}
      {status ? <p className="rounded-[18px_5px_18px_5px] border border-black/10 bg-white/80 p-4 text-sm leading-7 text-slate-600 lg:col-span-3">{status}</p> : null}
    </div>
  );
}
