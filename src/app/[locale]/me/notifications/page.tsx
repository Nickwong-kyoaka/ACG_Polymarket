import Link from "next/link";
import { ArrowRight, BellRing } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale, localePath, type PublicLocale } from "@/components/acg-locale";
import { NotificationCenter } from "@/components/notification-center";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale: rawLocale }, session] = await Promise.all([params, auth()]);
  if (!isPublicLocale(rawLocale)) notFound();
  const locale: PublicLocale = rawLocale;
  const zh = locale === "zh-Hant";
  if (!session?.user?.id) return <div className="exchange-page"><section className="mx-auto max-w-2xl border border-[#2c2724] bg-[#fffaf4] p-8 text-center"><BellRing className="mx-auto h-9 w-9 text-[#c85d5a]" /><h1 className="mt-5 font-display text-4xl">{zh ? "登入後收下通知便條" : "Sign in to receive notification notes"}</h1><Link href={localePath(locale, "/onboarding")} className="exchange-button-primary mt-6">{zh ? "前往登入" : "Continue to sign in"}<ArrowRight className="h-4 w-4" /></Link></section></div>;
  const [records, storedPreferences] = await Promise.all([
    prisma.notification.findMany({ where: { userId: session.user.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50 }),
    prisma.notificationPreference.findUnique({ where: { userId: session.user.id } }),
  ]);
  const preferences = storedPreferences ?? { followedContent: true, seriesUpdates: true, predictionChanges: true, predictionClosing: true, resolutions: true, moderationResults: true };
  return <div className="exchange-page"><header className="border-b border-[#2c2724] pb-7"><p className="exchange-kicker">MY ROOM / NOTICES</p><h1 className="mt-4 font-display text-5xl sm:text-6xl">{zh ? "回到房間的消息" : "Updates that found their way back"}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[#716862]">{zh ? "關注更新、預測截止與結算、投稿審核結果，都可以在這裡慢慢查看。" : "Follow updates, prediction deadlines and resolutions, and review results at your own pace."}</p></header><NotificationCenter locale={locale} initialItems={records.map((item) => ({ id: item.id, title: item.title, body: item.body, type: item.type, href: item.href, readAt: item.readAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString() }))} initialPreferences={preferences} /></div>;
}
