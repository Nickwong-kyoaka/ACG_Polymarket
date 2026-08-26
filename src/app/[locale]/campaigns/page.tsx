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
  const copy = locale === "zh-Hant" ? { eyebrow: "SHARED MILESTONES", title: "大家留下的心意，會一起點亮新的收藏。", body: "每一份應援都會推進角色活動；到達里程碑時，徽章、安慰內容與房間收藏會一起亮起來。", count: `${campaigns.length} 個應援活動`, empty: "新的角色活動正在布置中，先去角色目錄走走吧。" } : { eyebrow: "SHARED MILESTONES", title: "Affection left by everyone lights up new keepsakes together.", body: "Every support unit moves its character campaign forward. Milestones open badges, comfort moments, and room collectibles for the community.", count: `${campaigns.length} support campaigns`, empty: "New character campaigns are being dressed for launch. Wander through the catalog in the meantime." };
  return <div className="exchange-page"><header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.body} /><div className="rounded-[18px_5px_18px_5px] bg-[#111827] px-5 py-4 text-sm font-black text-white"><Flag className="mr-2 inline h-4 w-4 text-[#ffcc66]" />{copy.count}</div></header>{campaigns.length ? <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">{campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign as PublicCampaign} locale={locale} />)}</section> : <div className="exchange-panel p-12 text-center font-bold text-slate-500">{copy.empty}</div>}</div>;
}
