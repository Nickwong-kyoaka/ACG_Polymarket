import Link from "next/link";
import { ArrowRight, TicketCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale, localePath, type PublicLocale } from "@/components/acg-locale";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectivePredictionStatus, syncPredictionReminders } from "@/lib/prediction-market";

export const dynamic = "force-dynamic";

export default async function MyPredictionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale: rawLocale }, session] = await Promise.all([params, auth()]);
  if (!isPublicLocale(rawLocale)) notFound();
  const locale: PublicLocale = rawLocale;
  const zh = locale === "zh-Hant";
  if (!session?.user?.id) return <div className="exchange-page"><section className="mx-auto max-w-2xl border border-[#2c2724] bg-[#fffaf4] p-8 text-center shadow-[8px_8px_0_#d59b42]"><TicketCheck className="mx-auto h-9 w-9 text-[#5f8f87]" /><h1 className="mt-5 font-display text-4xl">{zh ? "登入後打開預測票簿" : "Sign in to open your prediction book"}</h1><p className="mt-4 text-sm leading-7 text-[#716862]">{zh ? "你的入場機率、持有份數、結算狀態與活動記錄都會整理在這裡。" : "Your entry probability, shares, resolution status, and activity are collected here."}</p><Link href={localePath(locale, "/onboarding")} className="exchange-button-primary mt-6">{zh ? "前往登入" : "Continue to sign in"}<ArrowRight className="h-4 w-4" /></Link></section></div>;

  await syncPredictionReminders(session.user.id);
  const positions = await prisma.predictionPosition.findMany({
    where: { userId: session.user.id },
    include: { outcome: true, market: { include: { locales: true, event: { include: { locales: true } } } } },
    orderBy: { updatedAt: "desc" },
  });
  const trades = await prisma.predictionTrade.findMany({
    where: { userId: session.user.id }, include: { outcome: true, market: { include: { locales: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100,
  });
  const dbLocale = zh ? "ZH_HANT" : "EN";

  return <div className="exchange-page">
    <section className="flex flex-wrap items-end justify-between gap-5 border-b border-[#2c2724] pb-7">
      <div><p className="exchange-kicker">MY PREDICTION BOOK</p><h1 className="mt-4 font-display text-5xl">{zh ? "我的預測記錄" : "My prediction record"}</h1><p className="mt-4 text-sm text-[#716862]">{zh ? "包含已賣出及已結算的記錄，不以盈虧排名。" : "Includes sold-out and settled records, without a profit leaderboard."}</p></div>
      <Link href={localePath(locale, "/predictions")} className="exchange-button-primary">{zh ? "回到預測桌" : "Open prediction desk"}<ArrowRight className="h-4 w-4" /></Link>
    </section>
    {positions.length ? <div className="grid gap-5 md:grid-cols-2">{positions.map((position) => {
      const marketCopy = position.market.locales.find((entry) => entry.locale === dbLocale);
      const eventCopy = position.market.event.locales.find((entry) => entry.locale === dbLocale);
      const status = effectivePredictionStatus(position.market);
      return <Link key={position.id} href={localePath(locale, `/predictions/${position.market.slug}`)} className="border border-[#2c2724]/25 bg-[#fffaf4] p-5">
        <p className="text-xs font-bold text-[#9a4c4a]">{eventCopy?.title ?? position.market.event.title} / {status}</p>
        <h2 className="mt-3 font-display text-2xl">{marketCopy?.question ?? position.market.question}</h2>
        <p className="mt-4 text-sm font-bold">{position.outcome.key} / {position.shares} {zh ? "份" : "shares"} / {position.settledAt ? (zh ? "已結算" : "Settled") : position.shares === 0 ? (zh ? "已全數賣出" : "Sold out") : (zh ? "持有中" : "Holding")}</p>
        <p className="mt-2 text-xs">{position.settledAt ? `${zh ? "結算入帳" : "Settlement credited"}: ${position.payout} SUP` : `${zh ? "剩餘成本" : "Remaining cost"}: ${position.totalCost} SUP / ${zh ? "勝出時可能結算" : "Possible winning payout"}: ${position.shares * position.market.payoutPerShare} SUP`}</p>
        {position.settledAt ? <time className="mt-2 block text-xs">{new Date(position.settledAt).toLocaleString(zh ? "zh-HK" : "en", { timeZone: "Asia/Hong_Kong" })}</time> : null}
      </Link>;
    })}</div> : <p className="border border-dashed border-[#2c2724]/30 p-8">{zh ? "還沒有參與記錄。" : "No participation recorded yet."}</p>}
    <section>
      <h2 className="font-display text-3xl">{zh ? "最近 100 筆交易" : "Latest 100 trades"}</h2>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs">
        <thead><tr className="border-b border-[#2c2724]">{(zh ? ["題目 / 香港時間", "交易", "份數", "成交後機率", "本金", "已銷毀費用", "SUP 變動"] : ["Question / Hong Kong time", "Trade", "Shares", "Probability after", "Gross", "Burned fee", "SUP change"]).map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{trades.map((trade) => <tr key={trade.id} className="border-b border-[#2c2724]/15">
          <td className="p-3"><Link className="font-bold underline" href={localePath(locale, `/predictions/${trade.market.slug}`)}>{trade.market.locales.find((entry) => entry.locale === dbLocale)?.question ?? trade.market.question}</Link><time className="mt-2 block">{trade.createdAt.toLocaleString(zh ? "zh-HK" : "en", { timeZone: "Asia/Hong_Kong" })}</time></td>
          <td className="p-3">{trade.side} {trade.outcome.key}</td><td className="p-3">{trade.quantity}</td><td className="p-3">{(trade.probabilityAfterBps / 100).toFixed(1)}%</td><td className="p-3">{trade.grossAmount}</td><td className="p-3">{trade.feeAmount}</td><td className="p-3">{trade.side === "BUY" ? "-" : "+"}{trade.netAmount}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </div>;
}
