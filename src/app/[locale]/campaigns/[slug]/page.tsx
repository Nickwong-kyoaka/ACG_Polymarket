import Link from "next/link";
import { ArrowLeft, Award, HeartHandshake, Radio, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale, localePath } from "@/components/acg-locale";
import { SectionHeading } from "@/components/ui/section-heading";
import { getOptionalSessionUserId } from "@/lib/auth";
import { getSupportCampaign } from "@/lib/support-campaigns";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const campaign = await getSupportCampaign(slug, locale, await getOptionalSessionUserId()).catch(() => null);
  if (!campaign) notFound();
  const copy = locale === "zh-Hant"
    ? { back: "返回活動", eyebrow: "共同里程碑", units: "共同應援份數", your: "你的貢獻", badge: "貢獻徽章", rewards: "里程碑獎勵", track: "解鎖路線", support: "到角色頁應援", note: "買入應援份數會自動計入活動；賣回不會扣除已完成的共同里程碑。", unlocked: "已解鎖", locked: "尚未解鎖" }
    : { back: "Back to campaigns", eyebrow: "SHARED MILESTONE", units: "Shared support units", your: "Your contribution", badge: "Contribution badge", rewards: "Milestone rewards", track: "UNLOCK TRACK", support: "Support on character page", note: "Bought support units automatically count toward this campaign. Returning units does not revoke a completed shared milestone.", unlocked: "UNLOCKED", locked: "LOCKED" };
  const image = campaign.character.primaryImage?.url;

  return (
    <div className="exchange-page">
      <Link href={localePath(locale, "/campaigns")} className="inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-[#e83c62]"><ArrowLeft className="h-4 w-4" />{copy.back}</Link>
      <section className="exchange-panel overflow-hidden bg-[#111827] text-white">
        <div className="grid lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative min-h-[480px] overflow-hidden" style={{ background: `linear-gradient(145deg, ${campaign.character.accentFrom}, ${campaign.character.accentTo})` }}>
            {image && (image.startsWith("https://") || image.startsWith("/")) ? (
              <div role="img" aria-label={campaign.character.primaryImage?.altText} className="absolute inset-0 bg-cover bg-top" style={{ backgroundImage: `linear-gradient(180deg,transparent 30%,rgba(8,12,22,.72)),url(${JSON.stringify(image)})` }} />
            ) : (
              <><div className="signal-orbit signal-orbit-one" /><div className="signal-orbit signal-orbit-two" /><span className="signal-glyph">推</span></>
            )}
          </div>
          <div className="p-7 sm:p-10">
            <p className="exchange-kicker text-[#ffcc66]">{copy.eyebrow}</p>
            <p className="mt-7 text-xs font-black uppercase tracking-[.2em] text-[#3ed6e0]">{campaign.character.name}</p>
            <h1 className="mt-3 font-display text-5xl leading-none sm:text-6xl">{campaign.title}</h1>
            <p className="mt-6 text-base leading-8 text-white/65">{campaign.description}</p>
            <div className="mt-8">
              <div className="flex items-end justify-between"><span className="text-4xl font-black">{campaign.progressPercent}%</span><span className="text-xs font-black text-white/45">{campaign.currentUnits} / {campaign.goalUnits}</span></div>
              <div className="mt-3 h-4 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#ff4e72] to-[#ffcc66]" style={{ width: `${campaign.progressPercent}%` }} /></div>
              <p className="mt-5 text-xs leading-6 text-white/45">{copy.note}</p>
              <Link href={localePath(locale, `/character/${campaign.character.slug}`)} className="exchange-button-primary mt-7"><HeartHandshake className="h-4 w-4" />{copy.support}</Link>
            </div>
          </div>
        </div>
      </section>
      <section>
        <SectionHeading eyebrow={copy.track} title={copy.rewards} description="" />
        <div className="grid gap-4 md:grid-cols-3">{campaign.rewards.map((reward) => (
          <article key={reward.id} className={`exchange-panel p-6 ${reward.unlocked ? "bg-[#eef8f7]" : ""}`}><div className="flex justify-between"><Award className={`h-6 w-6 ${reward.unlocked ? "text-[#19757a]" : "text-slate-300"}`} /><span className="text-xs font-black text-slate-400">{reward.thresholdUnits}</span></div><h2 className="mt-6 font-display text-2xl">{reward.label}</h2><p className="mt-2 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{reward.unlocked ? copy.unlocked : copy.locked}</p></article>
        ))}</div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <article className="exchange-panel p-6"><Radio className="h-5 w-5 text-[#e83c62]" /><p className="mt-4 text-[10px] font-black uppercase tracking-[.15em] text-slate-400">{copy.units}</p><p className="mt-2 text-3xl font-black">{campaign.currentUnits}</p></article>
        <article className="exchange-panel p-6"><Sparkles className="h-5 w-5 text-[#ff9f31]" /><p className="mt-4 text-[10px] font-black uppercase tracking-[.15em] text-slate-400">{copy.your}</p><p className="mt-2 text-3xl font-black">{campaign.viewerContribution?.units ?? 0}</p></article>
        <article className="exchange-panel p-6"><Award className="h-5 w-5 text-[#19757a]" /><p className="mt-4 text-[10px] font-black uppercase tracking-[.15em] text-slate-400">{copy.badge}</p><p className="mt-2 text-3xl font-black">LV.{campaign.viewerContribution?.badgeLevel ?? 0}</p></article>
      </section>
    </div>
  );
}
