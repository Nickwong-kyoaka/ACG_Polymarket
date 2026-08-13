import { Flag } from "lucide-react";
import { notFound } from "next/navigation";
import { CampaignCard, type PublicCampaign } from "@/components/campaign-card";
import { isPublicLocale } from "@/components/acg-locale";
import { SectionHeading } from "@/components/ui/section-heading";
import { getOptionalSessionUserId } from "@/lib/auth";
import { listSupportCampaigns } from "@/lib/support-campaigns";

export const dynamic = "force-dynamic";

export default async function CampaignsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const userId = await getOptionalSessionUserId();
  const campaigns = await listSupportCampaigns({ locale, userId, includeCompleted: true });
  const copy = locale === "zh-Hant" ? { eyebrow: "COMMUNAL SUPPORT", title: "一起解鎖喜歡，不需要製造輸家。", body: "每次買入應援份數都會同步推進角色活動。里程碑解鎖共同徽章與安慰／收藏內容，不比較誰輸誰贏。", count: `${campaigns.length} 個應援活動`, empty: "活動正在準備中。角色市場仍可正常應援。" } : { eyebrow: "COMMUNAL SUPPORT", title: "Unlock affection together without creating losers.", body: "Every supported unit advances its character campaign. Milestones unlock shared badges and comfort or collectible media, never a winner-versus-loser table.", count: `${campaigns.length} support campaigns`, empty: "Campaigns are being prepared. Character support remains open." };
  return <div className="exchange-page"><header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.body} /><div className="rounded-[18px_5px_18px_5px] bg-[#111827] px-5 py-4 text-sm font-black text-white"><Flag className="mr-2 inline h-4 w-4 text-[#ffcc66]" />{copy.count}</div></header>{campaigns.length ? <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">{campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign as PublicCampaign} locale={locale} />)}</section> : <div className="exchange-panel p-12 text-center font-bold text-slate-500">{copy.empty}</div>}</div>;
}
