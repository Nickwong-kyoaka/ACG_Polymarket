import { notFound, redirect } from "next/navigation";
import { isPublicLocale, localePath } from "@/components/acg-locale";
import { CreatorSeriesDesk } from "@/components/creator-series-desk";
import { requireSessionUserId } from "@/lib/auth";
import { listMyCreatorSeries } from "@/lib/creator-series";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function MyCreatorSeriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isPublicLocale(locale) || !getExchangeFeatureFlags().community) notFound();
  const userId = await requireSessionUserId().catch(() => null);
  if (!userId) redirect(`${localePath(locale, "/onboarding")}?next=${encodeURIComponent(localePath(locale, "/me/series"))}`);
  const data = await listMyCreatorSeries(userId);
  return <div className="exchange-page"><header className="border-b border-[#2c2724] pb-7"><p className="exchange-kicker">{locale === "zh-Hant" ? "作者書架" : "CREATOR SHELF"}</p><h1 className="mt-4 font-display text-5xl">{locale === "zh-Hant" ? "我的連載" : "My series"}</h1><p className="mt-4 text-sm text-[#716862]">{locale === "zh-Hant" ? "把自己的篇章整理成連載，讓讀者訂閱下一次更新。" : "Gather your chapters into a series readers can subscribe to."}</p></header><CreatorSeriesDesk {...data} locale={locale} /></div>;
}
