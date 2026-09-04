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

export default async function PredictionDetailPage({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ range?: string }> }) {
  const [{ locale: rawLocale, slug }, query, session] = await Promise.all([params, searchParams, auth()]);
  if (!isPublicLocale(rawLocale) || !getExchangeFeatureFlags().predictions) notFound();
  const locale: PublicLocale = rawLocale;
  const range: PredictionHistoryRange = query.range === "7d" || query.range === "30d" ? query.range : "24h";
  const market = await readMarket(slug, locale, session?.user?.id);
  const [history, discussion] = await Promise.all([
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
    <div className="exchange-page">
      <Link href={localePath(locale, "/predictions")} className="inline-flex w-fit items-center gap-2 text-xs font-black text-[#716862] hover:text-[#9a4c4a]"><ArrowLeft className="h-4 w-4" />{zh ? "回到預測桌" : "Back to prediction desk"}</Link>
      <section className="grid gap-8 border-y border-[#2c2724] py-8 xl:grid-cols-[1fr_390px] xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[.14em] text-[#9a4c4a]"><span>{market.event.title}</span><span>·</span><span>{market.status}</span></div>
          <h1 className="mt-5 max-w-5xl font-display text-4xl leading-[1.04] tracking-[-.045em] sm:text-6xl">{market.question}</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-[#716862]">{market.description}</p>
          <div className="mt-8 grid max-w-3xl grid-cols-2 border border-[#2c2724] bg-[#fffaf4]">
            <div className="border-r border-[#2c2724] p-5"><p className="text-[10px] font-black tracking-[.14em] text-[#3e786f]">YES</p><p className="mt-1 font-display text-5xl text-[#356e66]">{(yes / 100).toFixed(1)}%</p></div>
            <div className="p-5 text-right"><p className="text-[10px] font-black tracking-[.14em] text-[#a15154]">NO</p><p className="mt-1 font-display text-5xl text-[#a15154]">{(no / 100).toFixed(1)}%</p></div>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-[#716862]"><span className="inline-flex items-center gap-2"><UsersRound className="h-4 w-4" />{market.participantCount} {zh ? "位參與者" : "participants"}</span><span>{market.tradeCount} {zh ? "筆活動" : "activities"}</span><span>{zh ? "截止" : "Closes"} {new Intl.DateTimeFormat(zh ? "zh-HK" : "en", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Hong_Kong" }).format(new Date(market.closesAt))}</span></div>
        </div>
        <PredictionTradeTicket marketSlug={market.slug} signedIn={Boolean(session?.user?.id)} tradingOpen={market.tradingOpen} outcomes={market.outcomes.map((outcome) => ({ key: outcome.key, probabilityBps: outcome.probabilityBps }))} myPositions={market.myPositions.map((position) => ({ outcome: position.outcome, shares: position.shares }))} locale={locale} />
      </section>

      <div className="grid gap-7 xl:grid-cols-[1.3fr_.7fr]">
        <PredictionProbabilityChart buckets={history.buckets} range={range} baseHref={localePath(locale, `/predictions/${market.slug}`)} locale={locale} />
        <aside className="grid content-start gap-5">
          <section className="border border-[#2c2724] bg-[#f2ca61] p-5"><p className="text-[10px] font-black uppercase tracking-[.17em]">{zh ? "本段活動" : "RANGE ACTIVITY"}</p><div className="mt-4 grid grid-cols-2 gap-4"><div><strong className="font-display text-3xl">{history.summary.grossVolume}</strong><p className="text-[10px] font-bold text-[#716862]">SUP {zh ? "票面活動" : "volume"}</p></div><div><strong className="font-display text-3xl">{history.summary.uniqueParticipants}</strong><p className="text-[10px] font-bold text-[#716862]">{zh ? "參與者" : "participants"}</p></div></div></section>
          <section className="border border-[#2c2724]/20 bg-[#fffaf4] p-5"><div className="flex items-center gap-2 text-[#356e66]"><ShieldCheck className="h-5 w-5" /><p className="text-[10px] font-black uppercase tracking-[.15em]">RESOLUTION SOURCE</p></div><h2 className="mt-3 font-display text-2xl">{market.resolutionSource.label}</h2><p className="mt-3 text-xs leading-6 text-[#716862]">{market.edgeCaseRules}</p><a href={market.resolutionSource.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#9a4c4a]">{zh ? "開啟來源" : "Open source"}<ExternalLink className="h-3.5 w-3.5" /></a></section>
        </aside>
      </div>

      <section className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <div><p className="exchange-kicker">RULE BOOK</p><h2 className="mt-3 font-display text-4xl">{zh ? "這題會怎樣結算" : "How this question resolves"}</h2></div>
        <div className="border-l border-[#2c2724]/25 pl-6"><p className="text-sm leading-8 text-[#716862]">{zh ? "截止後管理員依票面來源提出 Yes、No 或作廢。接著保留 24 小時讓有證據的挑戰進場；有有效爭議時，由第二名管理員確認，無法客觀判定則退回相關 SUP。" : "After close, an administrator proposes Yes, No, or Void from the listed source. A 24-hour evidence challenge follows; a valid dispute requires a second reviewer, while an objectively unresolved question is voided and refunded."}</p><p className="mt-4 text-xs font-bold text-[#2c2724]">{zh ? `每份勝出結算 ${market.payoutPerShare} SUP。` : `Each winning share settles at ${market.payoutPerShare} SUP.`}</p></div>
      </section>

      {activeProposal?.outcome ? <PredictionChallengePanel marketSlug={market.slug} proposalId={activeProposal.id} outcome={activeProposal.outcome.label} challengeOpen={market.status === "PROPOSED" || market.status === "CHALLENGE"} challenges={activeProposal.challenges} signedIn={Boolean(session?.user?.id)} locale={locale} /> : null}

      <PostConversation predictionMarketId={market.id} initialComments={comments} locale={locale} signedIn={Boolean(session?.user?.id)} canModerate={false} context="prediction" />
    </div>
  );
}
