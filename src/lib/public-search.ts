import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { PublicLocale } from "@/components/acg-locale";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";

export type SearchResult = { id: string; slug: string; title: string; summary: string };
export type PublicSearchResults = { query: string; characters: SearchResult[]; posts: SearchResult[]; series: SearchResult[] };

export function normalizeSearchQuery(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.replace(/[\u0000-\u001f]/g, " ").trim().replace(/\s+/g, " ").slice(0, 120) ?? "";
}

export async function searchPublicContent(rawQuery: string, locale: PublicLocale): Promise<PublicSearchResults> {
  const query = normalizeSearchQuery(rawQuery);
  const empty = { query, characters: [], posts: [], series: [] };
  if (!query) return empty;
  const features = getExchangeFeatureFlags();
  const code = locale === "zh-Hant" ? "ZH_HANT" : "EN";
  const contains = { contains: query, mode: "insensitive" as const };
  const publicPost: Prisma.PostWhereInput = {
    status: "PUBLISHED", publishedAt: { lte: new Date() },
    author: { creatorProfile: { isNot: { status: "SUSPENDED" } } },
    OR: [{ creatorSeriesId: null }, { creatorSeries: { published: true } }],
  };
  const [characters, posts, series] = await Promise.all([
    prisma.character.findMany({
      where: { publishStatus: "PUBLISHED", OR: [{ name: contains }, { title: contains }, { summary: contains }, { locales: { some: { OR: [{ name: contains }, { title: contains }, { summary: contains }] } } }] },
      select: { id: true, slug: true, name: true, summary: true, locales: { where: { locale: code }, select: { name: true, summary: true } } },
      orderBy: [{ supporterCount: "desc" }, { id: "asc" }], take: 12,
    }),
    features.community ? prisma.post.findMany({
      where: { AND: [publicPost, { OR: [{ title: contains }, { body: contains }] }] },
      select: { id: true, slug: true, title: true, body: true },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }], take: 12,
    }) : Promise.resolve([]),
    prisma.series.findMany({
      // Series has no publication flag. Only discover entries linked to public content.
      where: { AND: [{ OR: [{ characters: { some: { publishStatus: "PUBLISHED" } } }, ...(features.community ? [{ posts: { some: publicPost } }] : [])] }, { OR: [{ title: contains }, { summary: contains }, { locales: { some: { OR: [{ title: contains }, { summary: contains }] } } }] }] },
      select: { id: true, slug: true, title: true, summary: true, locales: { where: { locale: code }, select: { title: true, summary: true } } },
      orderBy: [{ title: "asc" }, { id: "asc" }], take: 12,
    }),
  ]);
  const excerpt = (value: string) => value.replace(/\s+/g, " ").slice(0, 200);
  return {
    query,
    characters: characters.map((entry) => ({ id: entry.id, slug: entry.slug, title: entry.locales[0]?.name ?? entry.name, summary: excerpt(entry.locales[0]?.summary ?? entry.summary) })),
    posts: posts.map((entry) => ({ id: entry.id, slug: entry.slug, title: entry.title, summary: excerpt(entry.body) })),
    series: series.map((entry) => ({ id: entry.id, slug: entry.slug, title: entry.locales[0]?.title ?? entry.title, summary: excerpt(entry.locales[0]?.summary ?? entry.summary) })),
  };
}
