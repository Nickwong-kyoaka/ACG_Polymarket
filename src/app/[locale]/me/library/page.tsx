import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isPublicLocale, localePath } from "@/components/acg-locale";
import { requireSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function MyLibrary({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const userId = await requireSessionUserId().catch(() => null);
  if (!userId) redirect(`${localePath(locale, "/onboarding")}?next=${encodeURIComponent(localePath(locale, "/me/library"))}`);
  const entries = await prisma.libraryEntry.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, include: { series: { include: { locales: true } } } });
  const series = await prisma.series.findMany({ take: 100, orderBy: { title: "asc" }, select: { id: true, slug: true, title: true, locales: true } });
  const zh = locale === "zh-Hant";
  const labels: Record<string, string> = zh ? { WANT: "想看", WATCHING: "在看", COMPLETED: "看完", ON_HOLD: "擱置", DROPPED: "棄番" } : { WANT: "Want to watch", WATCHING: "Watching", COMPLETED: "Completed", ON_HOLD: "On hold", DROPPED: "Dropped" };
  const title = (item: typeof series[number]) => item.locales.find((entry) => entry.locale === (zh ? "ZH_HANT" : "EN"))?.title ?? item.title;
  return <div className="exchange-page"><h1 className="font-display text-5xl">{zh ? "我的追番簿" : "My watch journal"}</h1><section className="grid gap-4 sm:grid-cols-2">{entries.map((entry) => <Link key={entry.seriesId} className="exchange-panel p-6" href={localePath(locale, `/series/${entry.series.slug}`)}><p className="text-xs text-[#a34855]">{labels[entry.status]} · {entry.private ? (zh ? "私人" : "Private") : (zh ? "公開" : "Public")}</p><h2 className="mt-3 font-display text-3xl">{title(entry.series)}</h2></Link>)}</section><h2 className="font-display text-3xl">{zh ? "再找一部作品" : "Find your next series"}</h2><div className="grid gap-3 sm:grid-cols-3">{series.map((item) => <Link key={item.id} className="exchange-panel p-4 text-sm font-bold" href={localePath(locale, `/series/${item.slug}`)}>{title(item)}</Link>)}</div></div>;
}
