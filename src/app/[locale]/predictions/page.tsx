import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Landmark, TimerReset } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale, localePath, pick, type PublicLocale } from "@/components/acg-locale";
import { LobbyPredictionTicket } from "@/components/lobby-prediction-ticket";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { listPredictionEvents } from "@/lib/prediction-market";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const zh = locale === "zh-Hant";
  return {
    title: zh ? "季番預測桌" : "Season Prediction Desk",
    description: zh ? "以公開來源、截止時間和站內 SUP 記下對 ACG 消息的判斷。" : "Record your read on upcoming ACG news with public sources, deadlines, and earned SUP.",
    alternates: { canonical: `/${locale}/predictions`, languages: { en: "/en/predictions", "zh-Hant": "/zh-Hant/predictions" } },
  };
}

export default async function PredictionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale: PublicLocale = rawLocale;
  if (!getExchangeFeatureFlags().predictions) notFound();
  const { events } = await listPredictionEvents({ locale, limit: 20 });
  const openMarkets = events.flatMap((event) => event.markets.map((market) => ({ event, market }))).filter(({ market }) => market.status === "OPEN");
  const zh = locale === "zh-Hant";

  return (
    <div className="exchange-page">
      <section className="grid gap-6 border-y border-[#2c2724] py-8 lg:grid-cols-[1.05fr_.95fr] lg:items-end lg:py-12">
        <div>
          <p className="exchange-kicker">SEASON PREDICTION DESK / 03</p>
          <h1 className="exchange-title mt-5">{zh ? "下一則消息出現以前，先留下你的判斷。" : "Leave your read before the next announcement arrives."}</h1>
        </div>
        <div className="lg:border-l lg:border-[#2c2724]/25 lg:pl-8">
          <p className="text-base leading-8 text-[#716862]">{zh ? "每一題都有明確截止時間和公開結算來源。Yes / No 的票面數字代表目前機率；角色應援頁的 SUP / 份則只代表支持熱度，兩張桌不會混在一起。" : "Every question has a deadline and public resolution source. Yes / No ticket prices show current probability; SUP per unit on character pages remains a support signal. The two desks stay separate."}</p>
          <div className="mt-5 flex flex-wrap gap-3"><Link href={localePath(locale, "/me/predictions")} className="exchange-button-primary">{zh ? "我的預測票簿" : "My prediction book"}<ArrowRight className="h-4 w-4" /></Link><Link href={localePath(locale, "/help/market-rules")} className="exchange-button-secondary">{zh ? "讀結算方式" : "Read resolution guide"}</Link></div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          [BookOpenCheck, zh ? "來源先行" : "Source first", zh ? "官方公告或公開資料頁會固定在票面旁。" : "Official announcements or public data pages stay beside the ticket."],
          [TimerReset, zh ? "截止後鎖定" : "Locked at close", zh ? "停止交易後進入提出結果與 24 小時挑戰期。" : "Trading stops before proposal and a 24-hour challenge window."],
          [Landmark, zh ? "站內 SUP" : "Earned SUP only", zh ? "每份勝出時結算 100 SUP，不涉及充值或現金。" : "A winning share settles at 100 SUP, with no purchase or cash value."],
        ].map(([Icon, title, body]) => <article key={String(title)} className="border-l-4 border-[#c85d5a] bg-[#fffaf4] p-5"><Icon className="h-5 w-5 text-[#5f8f87]" /><h2 className="mt-4 font-display text-xl">{String(title)}</h2><p className="mt-2 text-xs leading-6 text-[#716862]">{String(body)}</p></article>)}
      </section>

      <section>
        <div className="mb-7 flex items-end justify-between gap-5"><div><p className="exchange-kicker">OPEN QUESTIONS</p><h2 className="mt-3 font-display text-4xl sm:text-5xl">{zh ? "正在交換的判斷" : "Reads on the table"}</h2></div><span className="font-display text-5xl text-[#c85d5a]">{String(openMarkets.length).padStart(2, "0")}</span></div>
        {openMarkets.length ? <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">{openMarkets.map(({ event, market }) => {
          const yes = market.outcomes.find((outcome) => outcome.key === "YES")?.probabilityBps ?? 5_000;
          return <LobbyPredictionTicket key={market.id} href={localePath(locale, `/predictions/${market.slug}`)} eyebrow={event.title} question={market.question} yesLabel="YES" noLabel="NO" yesProbability={yes / 10_000} participants={market.participantCount} closesLabel={new Intl.DateTimeFormat(zh ? "zh-HK" : "en", { dateStyle: "medium", timeZone: "Asia/Hong_Kong" }).format(new Date(market.closesAt))} confidenceLabel={market.tradeCount > 20 ? pick(locale, "ACTIVE READ", "活躍觀測") : pick(locale, "EARLY READ", "早期判斷")} />;
        })}</div> : <div className="border border-dashed border-[#2c2724]/30 bg-[#fffaf4] p-8 text-center"><p className="font-display text-2xl">{zh ? "今天沒有開放中的題目" : "No questions are open today"}</p><p className="mt-2 text-sm text-[#716862]">{zh ? "新的季番訊號整理好後會出現在這裡。" : "New seasonal signals will appear here once their sources are ready."}</p></div>}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {events.map((event, index) => <article key={event.id} className="border-t border-[#2c2724] pt-5"><div className="flex items-start justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a4c4a]">{event.category}</p><h2 className="mt-2 font-display text-3xl">{event.title}</h2></div><span className="font-display text-4xl text-[#d59b42]">0{index + 1}</span></div><p className="mt-3 max-w-2xl text-sm leading-7 text-[#716862]">{event.description}</p><div className="mt-5 grid gap-2">{event.markets.map((market) => <Link key={market.id} href={localePath(locale, `/predictions/${market.slug}`)} className="flex items-center justify-between gap-3 border border-[#2c2724]/20 bg-[#fffaf4] px-4 py-3 text-sm font-bold transition hover:border-[#2c2724]"><span>{market.question}</span><ArrowRight className="h-4 w-4 shrink-0" /></Link>)}</div></article>)}
      </section>
    </div>
  );
}
