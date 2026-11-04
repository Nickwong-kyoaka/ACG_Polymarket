import { requireAdminSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Retention = { members: number; d1Eligible: number; d1Returned: number; d7Eligible: number; d7Returned: number; followed: number; saved: number };
async function loadAnalytics() {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [events, authors, rows, reports, resolutions] = await Promise.all([
    prisma.analyticsEvent.groupBy({ by: ["name"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.post.findMany({ where: { status: "PUBLISHED", publishedAt: { gte: since } }, distinct: ["authorId"], select: { authorId: true } }),
    prisma.$queryRaw<Retention[]>`
      WITH cohort AS (
        SELECT id, ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Hong_Kong')::date AS joined
        FROM "User" WHERE "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '30 days'
      ), today AS (SELECT (now() AT TIME ZONE 'Asia/Hong_Kong')::date AS day)
      SELECT count(*)::int AS members,
        count(*) FILTER (WHERE joined + 1 <= today.day)::int AS "d1Eligible",
        count(*) FILTER (WHERE joined + 1 <= today.day AND EXISTS (
          SELECT 1 FROM "AnalyticsEvent" e WHERE e."userId" = cohort.id AND e.name = 'PAGE_VIEW'
          AND (e."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Hong_Kong')::date = joined + 1))::int AS "d1Returned",
        count(*) FILTER (WHERE joined + 7 <= today.day)::int AS "d7Eligible",
        count(*) FILTER (WHERE joined + 7 <= today.day AND EXISTS (
          SELECT 1 FROM "AnalyticsEvent" e WHERE e."userId" = cohort.id AND e.name = 'PAGE_VIEW'
          AND (e."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Hong_Kong')::date = joined + 7))::int AS "d7Returned",
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "AnalyticsEvent" e WHERE e."userId" = cohort.id AND e.name = 'FOLLOW'))::int AS followed,
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "AnalyticsEvent" e WHERE e."userId" = cohort.id AND e.name = 'SAVE'))::int AS saved
      FROM cohort CROSS JOIN today`,
    prisma.report.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.predictionMarket.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return { events, authors, rows, reports, resolutions };
}

export default async function AnalyticsPage() {
  await requireAdminSessionUserId();
  const { events, authors, rows, reports, resolutions } = await loadAnalytics();
  const retention = rows[0];
  const percentage = (count: number, eligible: number) => eligible ? `${(count / eligible * 100).toFixed(1)}% (${count}/${eligible})` : "Not enough eligible data";
  return <div className="grid gap-7"><header><h1 className="font-display text-4xl">Community activity</h1><p className="mt-3 text-sm text-slate-500">Activity uses recorded events. Retention uses accounts created in the last 30 days, returning on the exact Hong Kong day after registration. Every rate shows its sample size.</p></header><div className="grid gap-4 md:grid-cols-3">{[
    ["New accounts / 30 days", retention?.members ?? 0], ["D1 return", percentage(retention?.d1Returned ?? 0, retention?.d1Eligible ?? 0)], ["D7 return", percentage(retention?.d7Returned ?? 0, retention?.d7Eligible ?? 0)],
    ["First follow", percentage(retention?.followed ?? 0, retention?.members ?? 0)], ["First save", percentage(retention?.saved ?? 0, retention?.members ?? 0)], ["Active published creators / 7 days", authors.length],
  ].map(([label, value]) => <article key={String(label)} className="exchange-panel p-5"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-3 font-display text-2xl">{value}</p></article>)}</div><section className="exchange-panel p-6"><h2 className="font-display text-2xl">Recorded events / 7 days</h2><dl className="mt-5 grid gap-3">{events.map((event) => <div className="flex justify-between gap-4 border-b py-2" key={event.name}><dt>{event.name}</dt><dd>{event._count._all}</dd></div>)}</dl></section><section className="grid gap-4 md:grid-cols-2"><div className="exchange-panel p-6"><h2 className="font-bold">Report queue</h2>{reports.map((row) => <p className="mt-3" key={row.status}>{row.status}: {row._count._all}</p>)}</div><div className="exchange-panel p-6"><h2 className="font-bold">Prediction lifecycle</h2>{resolutions.map((row) => <p className="mt-3" key={row.status}>{row.status}: {row._count._all}</p>)}</div></section></div>;
}
