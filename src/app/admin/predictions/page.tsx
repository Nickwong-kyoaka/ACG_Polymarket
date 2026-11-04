import { AdminPredictionConsole } from "@/components/admin/admin-prediction-console";
import { effectivePredictionStatus, getPredictionChallengeReviews, getPredictionTreasuryStatus } from "@/lib/prediction-market";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPredictionsPage() {
  const [records, treasury] = await Promise.all([
    prisma.predictionEvent.findMany({
      include: { markets: { include: { outcomes: true, resolutionProposals: { orderBy: { proposedAt: "desc" }, include: { challenges: { orderBy: { createdAt: "asc" } }, outcome: true } }, _count: { select: { trades: true } } }, orderBy: { createdAt: "desc" } } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }),
    getPredictionTreasuryStatus(),
  ]);
  const reviewsByMarket = new Map(await Promise.all(records.flatMap((event) => event.markets).map(async (market) => [market.id, await getPredictionChallengeReviews(market.id)] as const)));
  const events = records.map((event) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    category: event.category,
    markets: event.markets.map((market) => ({
      id: market.id,
      slug: market.slug,
      question: market.question,
      status: effectivePredictionStatus(market),
      closesAt: market.closesAt.toISOString(),
      sourceUrl: market.resolutionSourceUrl,
      sourceLabel: market.resolutionSourceLabel,
      participantCount: market.participantCount,
      tradeCount: market._count.trades,
      outcomes: market.outcomes.map((outcome) => ({ id: outcome.id, key: outcome.key })),
      latestProposal: (() => {
        const active = market.resolutionProposals.find((proposal) => ["PROPOSED", "CHALLENGED"].includes(proposal.status));
        return active ? { id: active.id, status: active.status, challengeEndsAt: active.challengeEndsAt.toISOString() } : null;
      })(),
      proposals: market.resolutionProposals.map((proposal) => ({
        id: proposal.id, status: proposal.status, outcome: proposal.outcome?.key ?? "VOID",
        reasoning: proposal.reasoning, evidenceUrl: proposal.evidenceUrl,
        challenges: proposal.challenges.map((challenge) => ({
          id: challenge.id, reason: challenge.reason, evidenceUrl: challenge.evidenceUrl,
          accepted: challenge.accepted,
          review: reviewsByMarket.get(market.id)?.find((review) => review.challengeId === challenge.id) ?? null,
        })),
      })),
    })),
  }));
  return <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12"><header><p className="text-xs font-black uppercase tracking-[.2em] text-[#ff3d7f]">LMSR operations</p><h1 className="mt-3 font-display text-5xl text-[#171126]">Prediction desk</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">Create source-led events, reserve treasury liability before opening, lock questions at deadline, and move resolution through proposal, challenge, finalization, or refund.</p></header><AdminPredictionConsole events={events} treasury={treasury} /></div>;
}
