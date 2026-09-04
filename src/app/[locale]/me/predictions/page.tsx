import Link from "next/link";
import { ArrowRight, TicketCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale, localePath, type PublicLocale } from "@/components/acg-locale";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MyPredictionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale: rawLocale }, session] = await Promise.all([params, auth()]);
  if (!isPublicLocale(rawLocale)) notFound();
  const locale: PublicLocale = rawLocale;
  const zh = locale === "zh-Hant";
  if (!session?.user?.id) return <div className="exchange-page"><section className="mx-auto max-w-2xl border border-[#2c2724] bg-[#fffaf4] p-8 text-center shadow-[8px_8px_0_#d59b42]"><TicketCheck className="mx-auto h-9 w-9 text-[#5f8f87]" /><h1 className="mt-5 font-display text-4xl">{zh ? "登入後打開預測票簿" : "Sign in to open your prediction book"}</h1><p className="mt-4 text-sm leading-7 text-[#716862]">{zh ? "你的入場機率、持有份數、結算狀態與活動記錄都會整理在這裡。" : "Your entry probability, shares, resolution status, and activity are collected here."}</p><Link href={localePath(locale, "/onboarding")} className="exchange-button-primary mt-6">{zh ? "前往登入" : "Continue to sign in"}<ArrowRight className="h-4 w-4" /></Link></section></div>;

  const positions = await prisma.predictionPosition.findMany({
    where: { userId: session.user.id, OR: [{ shares: { gt: 0 } }, { settledAt: { not: null } }] },
    include: { outcome: true, market: { include: { locales: true, event: { include: { locales: true } } } } },
    orderBy: { updatedAt: "desc" },
  });
  const dbLocale = zh ? "ZH_HANT" : "EN";

  return <div className="exchange-page"><section className="flex flex-wrap items-end justify-between gap-5 border-b border-[#2c2724] pb-7"><div><p className="exchange-kicker">MY PREDICTION BOOK</p><h1 className="mt-4 font-display text-5xl sm:text-6xl">{zh ? "我留下的判斷" : "The reads I left"}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[#716862]">{zh ? "這裡整理參與紀錄，不把 SUP 盈虧做成排行。" : "A record of participation, without turning SUP gains into a leaderboard."}</p></div><Link href={localePath(locale, "/predictions")} className="exchange-button-primary">{zh ? "回到預測桌" : "Open prediction desk"}<ArrowRight className="h-4 w-4" /></Link></section>{positions.length ? <div className="grid gap-5 md:grid-cols-2">{positions.map((position) => { const marketCopy = position.market.locales.find((entry) => entry.locale === dbLocale); const eventCopy = position.market.event.locales.find((entry) => entry.locale === dbLocale); return <Link key={position.id} href={localePath(locale, `/predictions/${position.market.slug}`)} className="group border border-[#2c2724]/25 bg-[#fffaf4] p-5 shadow-[5px_6px_0_rgba(44,39,36,.09)] transition hover:-translate-y-1"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#9a4c4a]">{eventCopy?.title ?? position.market.event.title}</p><h2 className="mt-3 font-display text-2xl leading-tight">{marketCopy?.question ?? position.market.question}</h2><div className="mt-5 grid grid-cols-3 border-y border-[#2c2724]/15 py-4 text-center"><div><strong className="font-display text-2xl">{position.outcome.key}</strong><p className="text-[9px] font-bold text-[#716862]">{zh ? "判斷" : "READ"}</p></div><div><strong className="font-display text-2xl">{position.shares}</strong><p className="text-[9px] font-bold text-[#716862]">{zh ? "持有份數" : "SHARES"}</p></div><div><strong className="font-display text-2xl">{position.settledAt ? position.payout : position.shares * position.market.payoutPerShare}</strong><p className="text-[9px] font-bold text-[#716862]">{position.settledAt ? (zh ? "已結算 SUP" : "SETTLED SUP") : (zh ? "可能結算" : "POSSIBLE")}</p></div></div><span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#9a4c4a]">{zh ? "打開票面" : "Open ticket"}<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span></Link>; })}</div> : <div className="border border-dashed border-[#2c2724]/30 bg-[#fffaf4] p-10 text-center"><p className="font-display text-3xl">{zh ? "票簿還是空白的" : "The ticket book is still blank"}</p><p className="mt-3 text-sm text-[#716862]">{zh ? "從一個有清楚來源的題目開始。" : "Begin with a question whose source feels clear to you."}</p></div>}</div>;
}
