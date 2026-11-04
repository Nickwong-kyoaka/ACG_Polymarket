import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale, localePath, type PublicLocale } from "@/components/acg-locale";
import type { PostComment } from "@/components/post-conversation";
import { PostConversation } from "@/components/post-conversation";
import { PredictionChallengePanel } from "@/components/prediction-challenge-panel";
import { PredictionProbabilityChart } from "@/components/prediction-probability-chart";
import { PredictionTradeTicket } from "@/components/prediction-trade-ticket";
import { PredictionMarketState, predictionProposalLabel, predictionState } from "@/components/prediction-market-state";
import { AppError } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { getPredictionHistory, getPredictionMarket, type PredictionHistoryRange } from "@/lib/prediction-market";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function readMarket(slug: string, locale: PublicLocale, userId?: string) {
  try {
    return await getPredictionMarket(slug, locale, userId);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  if (!isPublicLocale(rawLocale)) return {};
  const market = await readMarket(slug, rawLocale);
  return { title: market.question, description: market.description, alternates: { canonical: `/${rawLocale}/predictions/${slug}`, languages: { en: `/en/predictions/${slug}`, "zh-Hant": `/zh-Hant/predictions/${slug}` } } };
}

export default async function PredictionDetailPage({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ range?: string; outcome?: string }> }) {
  const [{ locale: rawLocale, slug }, query, session] = await Promise.all([params, searchParams, auth()]);
  if (!isPublicLocale(rawLocale) || !getExchangeFeatureFlags().predictions) notFound();
  const locale: PublicLocale = rawLocale;
  const range: PredictionHistoryRange = query.range === "7d" || query.range === "30d" ? query.range : "24h";
  const initialOutcome = query.outcome === "NO" ? "NO" : "YES";
  const market = await readMarket(slug, locale, session?.user?.id);
  const [history, discussion, wallet] = await Promise.all([
    getPredictionHistory(slug, range),
    prisma.comment.findMany({
      where: { predictionMarketId: market.id, status: "VISIBLE", parentId: null },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        user: { select: { name: true, profile: { select: { displayName: true, handle: true } } } },
        replies: { where: { status: "VISIBLE" }, orderBy: { createdAt: "asc" }, take: 20, include: { user: { select: { name: true, profile: { select: { displayName: true, handle: true } } } } } },
      },
    }),
    session?.user?.id ? prisma.wallet.findUnique({ where: { userId: session.user.id }, select: { softBalance: true } }) : null,
  ]);
  const yes = market.outcomes.find((outcome) => outcome.key === "YES")?.probabilityBps ?? 5_000;
  const no = 10_000 - yes;
  const zh = locale === "zh-Hant";
  const comments: PostComment[] = discussion.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    pinnedByAuthor: false,
    heartedByAuthor: false,
    author: { displayName: comment.user.profile?.displayName ?? comment.user.name ?? (zh ? "觀測者" : "Observer"), handle: comment.user.profile?.handle ?? "observer" },
    replies: comment.replies.map((reply) => ({ id: reply.id, content: reply.content, createdAt: reply.createdAt.toISOString(), pinnedByAuthor: false, heartedByAuthor: false, author: { displayName: reply.user.profile?.displayName ?? reply.user.name ?? (zh ? "觀測者" : "Observer"), handle: reply.user.profile?.handle ?? "observer" } })),
  }));
  const activeProposal = market.resolutionProposals.find((proposal) => proposal.status === "PROPOSED" || proposal.status === "CHALLENGED") ?? market.resolutionProposals[0];

  return (
    <div className="exchange-page prediction-detail text-[#222733]">
      <Link href={localePath(locale, "/predictions")} className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-[#606A78] hover:text-[#C4455C]"><ArrowLeft className="h-4 w-4" />{zh ? "所有預測" : "All predictions"}</Link>
      <header className="border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#606A78]"><span>{market.event.title}</span><PredictionMarketState status={market.status} locale={locale} /></div>
        <h1 className="mt-3 max-w-5xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{market.question}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[#606A78]">{market.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#606A78]"><strong className="text-lg text-[#177B65]">YES {(yes / 100).toFixed(1)}%</strong><strong className="text-lg text-[#B8495E]">NO {(no / 100).toFixed(1)}%</strong><span className="inline-flex items-center gap-1"><UsersRound className="h-4 w-4" />{market.participantCount} {zh ? "位參與者" : "participants"}</span><span>{market.tradeCount} {zh ? "筆交易" : "trades"}</span></div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-5">
          <PredictionProbabilityChart buckets={history.buckets} range={range} baseHref={`${localePath(locale, `/predictions/${market.slug}`)}?outcome=${initialOutcome}`} locale={locale} />
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-base font-bold">{zh ? "進度與下一步" : "Status and next steps"}</h2><p className="mt-2 text-sm leading-6 text-[#606A78]">{predictionState(market.status, locale).next}</p><dl className="mt-4 grid gap-3 text-xs text-[#606A78]">
            <div><dt className="font-semibold">{zh ? "交易截止" : "Trading closes"}</dt><dd className="mt-1">{new Intl.DateTimeFormat(zh ? "zh-HK" : "en", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Hong_Kong" }).format(new Date(market.closesAt))} HKT (UTC+8)</dd></div>
            {market.challengeEndsAt && <div><dt className="font-semibold">{zh ? "異議截止" : "Challenge deadline"}</dt><dd className="mt-1">{new Intl.DateTimeFormat(zh ? "zh-HK" : "en", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Hong_Kong" }).format(new Date(market.challengeEndsAt))} HKT</dd></div>}
            {market.resolvedAt && <div><dt className="font-semibold">{zh ? "結算時間" : "Settled at"}</dt><dd className="mt-1">{new Intl.DateTimeFormat(zh ? "zh-HK" : "en", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Hong_Kong" }).format(new Date(market.resolvedAt))} HKT</dd></div>}
          </dl>{["RESOLVED", "VOID"].includes(market.status) && <Link href={localePath(locale, "/me/predictions")} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#C4455C]">{zh ? "查看預測記錄" : "View prediction history"}</Link>}</section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-[#177B65]"><ShieldCheck className="h-5 w-5" /><h2 className="text-sm font-bold">{zh ? "結算來源" : "Resolution source"}</h2></div><h3 className="mt-3 text-lg font-bold">{market.resolutionSource.label}</h3><p className="mt-3 text-sm leading-6 text-[#606A78]">{market.edgeCaseRules}</p><a href={market.resolutionSource.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#C4455C]">{zh ? "開啟來源" : "Open source"}<ExternalLink className="h-4 w-4" /></a><p className="mt-3 border-t border-slate-100 pt-3 text-xs text-[#606A78]">{zh ? `此區間活動量 ${history.summary.grossVolume} SUP（不含費用） · ${history.summary.uniqueParticipants} 位參與者` : `Range volume ${history.summary.grossVolume} SUP (fees excluded) · ${history.summary.uniqueParticipants} participants`}</p></section>
        </div>
        <aside className="min-w-0 lg:sticky lg:top-24"><PredictionTradeTicket marketSlug={market.slug} signedIn={Boolean(session?.user?.id)} tradingOpen={market.tradingOpen} outcomes={market.outcomes.map((outcome) => ({ key: outcome.key, probabilityBps: outcome.probabilityBps }))} myPositions={market.myPositions.map((position) => ({ outcome: position.outcome, shares: position.shares }))} balance={wallet?.softBalance} payoutPerShare={market.payoutPerShare} marketVersion={market.marketVersion} userId={session?.user?.id} initialOutcome={initialOutcome} locale={locale} /></aside>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold">{zh ? "這題會怎樣結算" : "How this question resolves"}</h2>
        <p className="mt-3 text-sm leading-7 text-[#606A78]">{zh ? "截止後管理員依指定來源提出 Yes、No 或作廢。接著保留 24 小時讓有證據的挑戰進場；有有效爭議時，由第二名管理員確認，無法客觀判定則退回相關 SUP。" : "After close, an administrator proposes Yes, No, or Void from the listed source. A 24-hour evidence challenge follows; a valid dispute requires a second reviewer, while an objectively unresolved question is voided and refunded."}</p><p className="mt-3 text-xs font-semibold">{zh ? `每份勝出結算 ${market.payoutPerShare} SUP。結算值不等於利潤。` : `Each winning share settles at ${market.payoutPerShare} SUP. Payout value is not profit.`}</p>
      </section>

      {market.resolutionProposals.filter((proposal) => proposal.outcome).map((proposal) => <PredictionChallengePanel key={proposal.id} marketSlug={market.slug} proposalId={proposal.id} outcome={`${proposal.outcome!.label} (${predictionProposalLabel(proposal.status, locale)})`} challengeOpen={proposal.id === activeProposal?.id && ["PROPOSED", "CHALLENGE"].includes(market.status) && new Date(proposal.challengeEndsAt) > new Date()} challenges={proposal.challenges} signedIn={Boolean(session?.user?.id)} locale={locale} />)}

      <PostConversation predictionMarketId={market.id} initialComments={comments} locale={locale} signedIn={Boolean(session?.user?.id)} canModerate={false} context="prediction" />
    </div>
  );
}
