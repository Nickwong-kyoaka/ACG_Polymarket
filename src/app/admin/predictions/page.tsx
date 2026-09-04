import { AdminPredictionConsole } from "@/components/admin/admin-prediction-console";
import { getPredictionTreasuryStatus } from "@/lib/prediction-market";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPredictionsPage() {
  const [records, treasury] = await Promise.all([
    prisma.predictionEvent.findMany({
      include: { markets: { include: { outcomes: true, resolutionProposals: { orderBy: { proposedAt: "desc" }, take: 1 }, _count: { select: { trades: true } } }, orderBy: { createdAt: "desc" } } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }),
    getPredictionTreasuryStatus(),
  ]);
  const events = records.map((event) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    category: event.category,
    markets: event.markets.map((market) => ({
      id: market.id,
      slug: market.slug,
      question: market.question,
      status: market.status,
      closesAt: market.closesAt.toISOString(),
      sourceUrl: market.resolutionSourceUrl,
      sourceLabel: market.resolutionSourceLabel,
      participantCount: market.participantCount,
      tradeCount: market._count.trades,
      outcomes: market.outcomes.map((outcome) => ({ id: outcome.id, key: outcome.key })),
      latestProposal: market.resolutionProposals[0] ? { id: market.resolutionProposals[0].id, status: market.resolutionProposals[0].status, challengeEndsAt: market.resolutionProposals[0].challengeEndsAt.toISOString() } : null,
    })),
  }));
  return <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12"><header><p className="text-xs font-black uppercase tracking-[.2em] text-[#ff3d7f]">LMSR operations</p><h1 className="mt-3 font-display text-5xl text-[#171126]">Prediction desk</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">Create source-led events, reserve treasury liability before opening, lock questions at deadline, and move resolution through proposal, challenge, finalization, or refund.</p></header><AdminPredictionConsole events={events} treasury={treasury} /></div>;
}
