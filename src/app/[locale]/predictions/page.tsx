import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Landmark, TimerReset } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale, localePath, type PublicLocale } from "@/components/acg-locale";
import { PredictionMarketState, predictionState } from "@/components/prediction-market-state";
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
    <div className="exchange-page text-[#222733]">
      <section className="grid gap-5 border-b border-slate-200 pb-6 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold text-[#C4455C]">{zh ? "ACG 季番預測" : "ACG SEASON PREDICTIONS"}</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{zh ? "下一則消息前，你怎麼看？" : "What happens next?"}</h1>
        </div>
        <div>
          <p className="text-sm leading-6 text-[#606A78]">{zh ? "每題都有公開來源和截止時間。YES / NO 是目前機率，與角色應援熱度不同；使用站內 SUP，不涉及現金。" : "Public sources, clear deadlines, earned SUP. YES / NO shows current probability, not character support. No cash is involved."}</p>
          <div className="mt-4 flex flex-wrap gap-3"><Link href={localePath(locale, "/me/predictions")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C4455C] px-4 text-sm font-semibold text-white">{zh ? "我的預測記錄" : "My predictions"}<ArrowRight className="h-4 w-4" /></Link><Link href={localePath(locale, "/help/market-rules")} className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#606A78]">{zh ? "結算規則" : "Resolution guide"}</Link></div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          [BookOpenCheck, zh ? "來源先行" : "Source first", zh ? "官方公告或公開資料頁會固定在票面旁。" : "Official announcements or public data pages stay beside the ticket."],
          [TimerReset, zh ? "截止後鎖定" : "Locked at close", zh ? "停止交易後進入提出結果與 24 小時挑戰期。" : "Trading stops before proposal and a 24-hour challenge window."],
          [Landmark, zh ? "站內 SUP" : "Earned SUP only", zh ? "每份勝出時結算 100 SUP，不涉及充值或現金。" : "A winning share settles at 100 SUP, with no purchase or cash value."],
        ].map(([Icon, title, body]) => <article key={String(title)} className="rounded-2xl border border-slate-200 bg-white p-4"><Icon className="h-5 w-5 text-[#177B65]" /><h2 className="mt-3 text-base font-bold">{String(title)}</h2><p className="mt-2 text-xs leading-6 text-[#606A78]">{String(body)}</p></article>)}
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between gap-5"><h2 className="text-xl font-bold">{zh ? "交易中的題目" : "Open questions"}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-[#606A78]">{openMarkets.length}</span></div>
        {openMarkets.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{openMarkets.map(({ event, market }) => {
          const yes = market.outcomes.find((outcome) => outcome.key === "YES")?.probabilityBps ?? 5_000;
          return <article key={market.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[#606A78]">{event.title}</p><PredictionMarketState status={market.status} locale={locale} /></div><Link href={localePath(locale, `/predictions/${market.slug}`)} className="mt-3 inline-flex min-h-11 items-center text-lg font-bold leading-6 hover:text-[#C4455C]">{market.question}</Link><div className="mt-4 grid grid-cols-2 gap-2">{(["YES", "NO"] as const).map((outcome) => <Link key={outcome} href={`${localePath(locale, `/predictions/${market.slug}`)}?outcome=${outcome}`} className={`flex min-h-11 items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold ${outcome === "YES" ? "bg-[#177B65]/5 text-[#177B65]" : "bg-[#B8495E]/5 text-[#B8495E]"}`}><span>{outcome}</span><strong className="text-xl">{((outcome === "YES" ? yes : 10_000 - yes) / 100).toFixed(1)}%</strong></Link>)}</div><p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-[#606A78]">{market.participantCount} {zh ? "位參與者 · 截止" : "participants · closes"} {new Intl.DateTimeFormat(zh ? "zh-HK" : "en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Hong_Kong" }).format(new Date(market.closesAt))} HKT</p></article>;
        })}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center"><p className="text-xl font-bold">{zh ? "今天沒有開放中的題目" : "No questions are open today"}</p><p className="mt-2 text-sm text-[#606A78]">{zh ? "新的季番訊號整理好後會出現在這裡。" : "New seasonal signals will appear here once their sources are ready."}</p></div>}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {events.map((event) => <article key={event.id} className="border-t border-slate-200 pt-5"><h2 className="text-xl font-bold">{event.title}</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[#606A78]">{event.description}</p><div className="mt-4 grid gap-2">{event.markets.map((market) => <Link key={market.id} href={localePath(locale, `/predictions/${market.slug}`)} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition hover:border-[#C4455C]"><span><strong className="block">{market.question}</strong><span className="mt-1 block text-xs text-[#606A78]">{predictionState(market.status, locale).next}</span></span><span className="flex shrink-0 items-center gap-2"><PredictionMarketState status={market.status} locale={locale} /><ArrowRight className="h-4 w-4 shrink-0" /></span></Link>)}</div></article>)}
      </section>
    </div>
  );
}
