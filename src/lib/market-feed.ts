import type { Prisma } from "@prisma/client";
import { getBuyQuote } from "@/lib/market";
import { prisma } from "@/lib/prisma";

type FeedLocale = "en" | "zh-Hant";
type FeedSort = "trending" | "quote-asc" | "quote-desc" | "newest" | "supporters";

export interface MarketFeedOptions {
  limit?: number;
  cursor?: string;
  locale?: FeedLocale;
  search?: string;
  tag?: string;
  rightsType?: "ORIGINAL" | "LICENSED";
  featuredOnly?: boolean;
  sort?: FeedSort;
}

function localeCode(locale: FeedLocale) {
  return locale === "zh-Hant" ? "ZH_HANT" : "EN";
}

export async function getPositiveMarketFeed(options: MarketFeedOptions = {}) {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const locale = options.locale ?? "en";
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 50);
  const search = options.search?.trim();
  const where: Prisma.CharacterWhereInput = {
    publishStatus: "PUBLISHED",
    ...(options.rightsType ? { rightsType: options.rightsType } : {}),
    ...(options.featuredOnly ? { isFeatured: true } : {}),
    ...(options.tag
      ? { tags: { some: { label: { equals: options.tag, mode: "insensitive" } } } }
      : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { title: { contains: search, mode: "insensitive" } },
            { summary: { contains: search, mode: "insensitive" } },
            { locales: { some: { name: { contains: search, mode: "insensitive" } } } },
            { locales: { some: { title: { contains: search, mode: "insensitive" } } } },
            { series: { title: { contains: search, mode: "insensitive" } } },
            { series: { locales: { some: { title: { contains: search, mode: "insensitive" } } } } },
            { tags: { some: { label: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const characters = await prisma.character.findMany({
    where,
    include: {
      locales: true,
      series: { include: { locales: true } },
      tags: true,
      assets: {
        where: {
          workflowStatus: "PUBLISHED",
          contentRating: "SFW",
          permissionStatus: { notIn: ["REJECTED", "TAKEDOWN_REQUESTED"] },
        },
        include: { locales: true, derivatives: true },
        orderBy: [{ primaryPriority: "desc" }, { publishedAt: "desc" }],
      },
      supportCampaigns: {
        where: {
          status: "ACTIVE",
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        include: { locales: true },
        take: 1,
      },
      _count: { select: { comments: true, reactions: true } },
    },
  });
  const ids = characters.map((character) => character.id);
  const [buyTrades, recentTrades] = await Promise.all([
    ids.length
      ? prisma.trade.findMany({
          where: { characterId: { in: ids }, side: "BUY", createdAt: { gte: since } },
          select: { characterId: true, userId: true, quantity: true, totalCost: true },
        })
      : [],
    prisma.trade.findMany({
      where: { character: { publishStatus: "PUBLISHED" } },
      select: {
        id: true,
        side: true,
        quantity: true,
        totalCost: true,
        averageUnitPrice: true,
        quoteAfter: true,
        createdAt: true,
        character: { select: { id: true, slug: true, name: true, locales: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 20),
    }),
  ]);

  const metrics = new Map<string, { buyUnits: number; volume: number; supporters: Set<string> }>();
  for (const trade of buyTrades) {
    const metric = metrics.get(trade.characterId) ?? {
      buyUnits: 0,
      volume: 0,
      supporters: new Set<string>(),
    };
    metric.buyUnits += trade.quantity;
    metric.volume += trade.totalCost;
    metric.supporters.add(trade.userId);
    metrics.set(trade.characterId, metric);
  }

  const cards = characters.map((character) => {
    const localized = character.locales.find((entry) => entry.locale === localeCode(locale));
    const seriesLocalized = character.series.locales.find(
      (entry) => entry.locale === localeCode(locale),
    );
    const metric = metrics.get(character.id) ?? {
      buyUnits: 0,
      volume: 0,
      supporters: new Set<string>(),
    };
    const asset = character.assets[0];
    const assetLocalized = asset?.locales.find((entry) => entry.locale === localeCode(locale));
    const preferredDerivative = asset?.derivatives.find((entry) => entry.kind === "CARD");
    const campaign = character.supportCampaigns[0];
    const campaignLocalized = campaign?.locales.find(
      (entry) => entry.locale === localeCode(locale),
    );
    const currentQuote = getBuyQuote(character);
    return {
      id: character.id,
      slug: character.slug,
      name: localized?.name ?? character.name,
      title: localized?.title ?? character.title,
      seriesTitle: seriesLocalized?.title ?? character.series.title,
      rightsType: character.rightsType,
      isFeatured: character.isFeatured,
      tags: character.tags.map((entry) => entry.label),
      accentFrom: character.accentFrom,
      accentTo: character.accentTo,
      currentQuote,
      circulatingUnits: character.circulatingUnits,
      supporterCount: character.supporterCount,
      marketVersion: character.marketVersion,
      activity24h: {
        buyUnits: metric.buyUnits,
        uniqueSupporters: metric.supporters.size,
        volume: metric.volume,
      },
      social: { comments: character._count.comments, reactions: character._count.reactions },
      primaryImage: asset
        ? {
            url: preferredDerivative?.publicUrl ?? asset.publicUrl ?? (asset.storageKey.startsWith("assets/") ? `/${asset.storageKey}` : null),
            altText: assetLocalized?.altText ?? asset.altText,
            sourceLabel: asset.sourceLabel ?? null,
            creatorName: asset.creatorName ?? null,
            creatorUrl: asset.creatorUrl ?? null,
            licenseUrl: asset.licenseUrl ?? null,
            permissionStatus: asset.permissionStatus,
          }
        : null,
      campaign: campaign
        ? {
            id: campaign.id,
            slug: campaign.slug,
            title: campaignLocalized?.title ?? campaign.title,
            currentUnits: campaign.currentUnits,
            goalUnits: campaign.goalUnits,
            progressPercent: Math.min(
              100,
              Math.round((campaign.currentUnits / campaign.goalUnits) * 100),
            ),
          }
        : null,
      trendScore: metric.buyUnits * 2 + metric.supporters.size * 10,
      createdAt: character.createdAt,
    };
  });

  const sort = options.sort ?? "trending";
  cards.sort((left, right) => {
    if (sort === "quote-asc") return left.currentQuote - right.currentQuote;
    if (sort === "quote-desc") return right.currentQuote - left.currentQuote;
    if (sort === "newest") return right.createdAt.getTime() - left.createdAt.getTime();
    if (sort === "supporters") return right.supporterCount - left.supporterCount;
    return right.trendScore - left.trendScore || right.supporterCount - left.supporterCount;
  });

  const cursorIndex = options.cursor
    ? cards.findIndex((character) => character.id === options.cursor)
    : -1;
  const page = cards.slice(cursorIndex >= 0 ? cursorIndex + 1 : 0, cursorIndex + 1 + limit);
  const nextCursor =
    (cursorIndex >= 0 ? cursorIndex + 1 : 0) + page.length < cards.length
      ? page.at(-1)?.id ?? null
      : null;

  return {
    items: page.map(({ trendScore, createdAt, ...character }) => {
      void trendScore;
      void createdAt;
      return character;
    }),
    nextCursor,
    recentTrades: recentTrades.map((trade) => {
      const localized = trade.character.locales.find(
        (entry) => entry.locale === localeCode(locale),
      );
      return {
        id: trade.id,
        side: trade.side,
        quantity: trade.quantity,
        total: trade.totalCost,
        averagePrice: trade.averageUnitPrice,
        quoteAfter: trade.quoteAfter,
        timestamp: trade.createdAt.toISOString(),
        character: {
          id: trade.character.id,
          slug: trade.character.slug,
          name: localized?.name ?? trade.character.name,
        },
      };
    }),
    generatedAt: now.toISOString(),
  };
}
