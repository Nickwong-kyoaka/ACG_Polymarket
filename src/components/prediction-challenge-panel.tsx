"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Flag, LoaderCircle } from "lucide-react";
import type { PublicLocale } from "@/components/acg-locale";

interface ResolutionChallenge {
  id: string;
  reason: string;
  evidenceUrl: string;
  accepted: boolean | null;
  createdAt: string;
}

export function PredictionChallengePanel({ marketSlug, proposalId, outcome, challengeOpen, challenges, signedIn, locale }: { marketSlug: string; proposalId: string; outcome: string; challengeOpen: boolean; challenges: ResolutionChallenge[]; signedIn: boolean; locale: PublicLocale }) {
  const zh = locale === "zh-Hant";
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");

  async function submitChallenge() {
    setPending(true);
    setStatus("");
    try {
      const response = await fetch(`/api/predictions/${encodeURIComponent(marketSlug)}/challenge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proposalId, reason, evidenceUrl }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        setStatus(payload.error ?? (zh ? "挑戰暫時沒有送出。" : "The challenge could not be sent."));
        return;
      }
      setReason("");
      setEvidenceUrl("");
      setStatus(zh ? "證據已送到結算審核桌。" : "Your evidence is now at the resolution desk.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="border border-[#2c2724] bg-[#fffaf4] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a4c4a]">RESOLUTION WINDOW</p><h2 className="mt-2 font-display text-3xl">{zh ? `提議結果：${outcome}` : `Proposed result: ${outcome}`}</h2></div>
        <span className="border border-[#2c2724]/25 px-3 py-2 text-[10px] font-black text-[#716862]">{challengeOpen ? (zh ? "挑戰期開放中" : "Challenge window open") : (zh ? "挑戰期已結束" : "Challenge window closed")}</span>
      </div>
      <p className="mt-3 text-xs leading-6 text-[#716862]">{zh ? "只有能改變客觀結算判斷的公開證據才需要送進來；不同意見可以留在下方討論。" : "Send public evidence only when it could change the objective result; different opinions belong in the discussion below."}</p>
      {challengeOpen && signedIn ? <div className="mt-5 grid gap-3"><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={1000} className="filter-field resize-y" placeholder={zh ? "說明證據如何影響結算（至少 10 字）" : "Explain how the evidence affects resolution (10+ characters)"} /><input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} className="filter-field" type="url" placeholder="https://..." /><button type="button" disabled={pending || reason.trim().length < 10 || !evidenceUrl.startsWith("https://")} onClick={submitChallenge} className="exchange-button-primary justify-self-start disabled:opacity-45">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}{zh ? "送出證據挑戰" : "Submit evidence challenge"}</button></div> : null}
      {challengeOpen && !signedIn ? <p className="mt-5 border-l-3 border-[#d59b42] bg-[#f5eddf] p-3 text-xs font-bold text-[#716862]">{zh ? "登入後可以提交有來源的結算挑戰。" : "Sign in to submit a sourced resolution challenge."}</p> : null}
      {status ? <p className="mt-4 text-xs font-bold text-[#8a4e4e]" role="status">{status}</p> : null}
      {challenges.length ? <div className="mt-6 grid gap-3">{challenges.map((challenge) => <article key={challenge.id} className="border-t border-[#2c2724]/20 pt-3"><p className="text-xs leading-6 text-[#514b47]">{challenge.reason}</p><a href={challenge.evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-[#9a4c4a]">{zh ? "查看證據" : "Open evidence"}<ExternalLink className="h-3 w-3" /></a></article>)}</div> : null}
    </section>
  );
}
