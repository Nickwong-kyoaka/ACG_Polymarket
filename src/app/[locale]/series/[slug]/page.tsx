import Link from "next/link";
import { notFound } from "next/navigation";
import { isPublicLocale, localePath } from "@/components/acg-locale";
import { EntityProposalForm } from "@/components/entity-proposal-form";
import { LibraryControls } from "@/components/library-controls";
import { getOptionalSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function SeriesPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isPublicLocale(locale)) notFound();
  const userId = await getOptionalSessionUserId();
  const code = locale === "zh-Hant" ? "ZH_HANT" : "EN";
  const series = await prisma.series.findUnique({ where: { slug }, include: { locales: true,
    characters: { where: { publishStatus: "PUBLISHED" }, select: { id: true, slug: true, name: true, locales: { where: { locale: code }, select: { name: true } } } },
    episodes: { orderBy: { number: "asc" }, include: { locales: { where: { locale: code } }, progress: { where: { userId: userId ?? "__guest__" } } } },
    libraryEntries: { where: { userId: userId ?? "__guest__" } }, ratings: { where: { userId: userId ?? "__guest__" } },
  } });
  if (!series) notFound();
  const citations = await prisma.sourceCitation.findMany({ where: { entityType: "SERIES", entityId: series.id }, orderBy: { retrievedAt: "desc" }, take: 20, select: { id: true, sourceUrl: true, sourceLabel: true, licenseName: true, fieldKey: true } });
  const copy = series.locales.find((item) => item.locale === code);
  const zh = locale === "zh-Hant";
  return <div className="exchange-page">
    <header className="exchange-panel bg-[#283338] p-8 text-white"><p className="exchange-kicker">{zh ? "作品資料簿" : "SERIES JOURNAL"}</p><h1 className="mt-5 font-display text-5xl">{copy?.title ?? series.title}</h1><p className="mt-6 whitespace-pre-wrap leading-8 text-white/75">{copy?.summary ?? series.summary}</p>{series.bangumiUrl ? <a href={series.bangumiUrl} target="_blank" rel="noreferrer" className="mt-5 inline-block underline">Bangumi</a> : null}</header>
    <LibraryControls seriesId={series.id} initialStatus={series.libraryEntries[0]?.status ?? null} initialRating={series.ratings[0]?.score ?? null} initialPrivate={series.libraryEntries[0]?.private ?? true} episodes={series.episodes.map((episode) => ({ id: episode.id, title: episode.locales[0]?.title ?? episode.title, watched: episode.progress[0]?.status === "WATCHED" }))} locale={locale} />
    <section className="grid gap-4 sm:grid-cols-3">{series.characters.map((character) => <Link className="exchange-panel p-6 font-display text-2xl" key={character.id} href={localePath(locale, `/character/${character.slug}`)}>{character.locales[0]?.name ?? character.name}</Link>)}</section>
    {citations.length ? <section className="exchange-panel grid gap-3 p-6"><h2 className="font-display text-2xl">{zh ? "資料來源與授權" : "Sources and attribution"}</h2>{citations.map((citation) => <div key={citation.id} className="text-sm leading-7"><a href={citation.sourceUrl} target="_blank" rel="noreferrer" className="underline">{citation.sourceLabel}</a>{citation.licenseName ? <p>{citation.licenseName}</p> : null}</div>)}</section> : null}
    <EntityProposalForm locale={locale} entityType="SERIES" entityId={series.id} currentSummary={copy?.summary ?? series.summary} fields={[{ key: "summary", label: zh ? "介紹" : "Summary", value: copy?.summary ?? series.summary }, { key: "title", label: zh ? "作品名" : "Series title", value: copy?.title ?? series.title }]} />
  </div>;
}
