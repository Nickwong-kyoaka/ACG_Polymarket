import Link from "next/link";
import { Award, Flag, Sparkles } from "lucide-react";
import { localePath, type PublicLocale } from "@/components/acg-locale";

export type PublicCampaign = {
  id: string;
  slug: string;
  status: string;
  title: string;
  description: string;
  goalUnits: number;
  currentUnits: number;
  progressPercent: number;
  character: { slug: string; name: string; title: string; accentFrom: string; accentTo: string; primaryImage: { url: string; altText: string; permissionStatus: string } | null };
  rewards: Array<{ id: string; thresholdUnits: number; kind: string; label: string; unlocked: boolean }>;
  viewerContribution: { units: number; badgeLevel: number } | null;
};

const statusZh: Record<string, string> = {
  DRAFT: "草稿",
  ACTIVE: "進行中",
  COMPLETED: "已完成",
  ARCHIVED: "已封存",
};

export function CampaignCard({ campaign, locale }: { campaign: PublicCampaign; locale: PublicLocale }) {
  const image = campaign.character.primaryImage;
  const hasImage = image?.url.startsWith("https://") || image?.url.startsWith("/");
  const status = locale === "zh-Hant" ? statusZh[campaign.status] ?? campaign.status : campaign.status;

  return <article className="exchange-panel group overflow-hidden">
    <div className="relative min-h-72 overflow-hidden p-6 text-white" style={{ background: `linear-gradient(145deg, ${campaign.character.accentFrom}, ${campaign.character.accentTo})` }}>
      {hasImage ? <div role="img" aria-label={image!.altText} className="absolute inset-0 bg-cover bg-top opacity-80 transition duration-700 group-hover:scale-105" style={{ backgroundImage: `linear-gradient(180deg,transparent 30%,rgba(8,12,22,.82)),url(${JSON.stringify(image!.url)})` }} /> : <><div className="signal-orbit signal-orbit-one" /><div className="signal-orbit signal-orbit-two" /><span className="signal-glyph">推</span></>}
      <div className="relative z-10 flex min-h-60 flex-col justify-between">
        <div className="flex justify-between gap-3"><span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[9px] font-black uppercase tracking-[.16em]">{status}</span>{campaign.viewerContribution ? <span className="rounded-full bg-[#ffcc66] px-3 py-1 text-[9px] font-black text-slate-900">{campaign.viewerContribution.units} {locale === "zh-Hant" ? "份貢獻" : "SUPPORTED"}</span> : null}</div>
        <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-white/58">{campaign.character.name}</p><h2 className="mt-2 font-display text-4xl leading-none">{campaign.title}</h2></div>
      </div>
    </div>
    <div className="grid gap-5 p-6">
      <p className="line-clamp-3 text-sm leading-7 text-slate-500">{campaign.description}</p>
      <div><div className="flex items-end justify-between"><p className="text-2xl font-black text-slate-900">{campaign.progressPercent}%</p><p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{campaign.currentUnits} / {campaign.goalUnits} {locale === "zh-Hant" ? "份" : "units"}</p></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-[#ece8de]"><div className="h-full rounded-full bg-gradient-to-r from-[#ff4e72] via-[#ff7a45] to-[#ffcc66]" style={{ width: `${campaign.progressPercent}%` }} /></div></div>
      <div className="flex flex-wrap gap-2">{campaign.rewards.slice(0, 3).map((reward) => <span key={reward.id} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] ${reward.unlocked ? "bg-[#eef8f7] text-[#19757a]" : "bg-[#f5f1e8] text-slate-400"}`}><Award className="h-3 w-3" />{reward.label}</span>)}</div>
      <Link href={localePath(locale, `/campaigns/${campaign.slug}`)} className="exchange-button-primary"><Flag className="h-4 w-4" />{locale === "zh-Hant" ? "加入共同應援" : "Join the shared support"}<Sparkles className="h-4 w-4" /></Link>
    </div>
  </article>;
}
