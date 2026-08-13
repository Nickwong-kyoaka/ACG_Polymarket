import { AppError } from "@/lib/api";
import { getBuyQuote } from "@/lib/market";
import { prisma } from "@/lib/prisma";

export type MarketHistoryRange = "24h" | "7d" | "30d";

export interface MarketHistoryResponse {
  range: MarketHistoryRange;
  buckets: Array<{
    timestamp: string;
    price: number;
    volume: number;
    buyUnits?: number;
    supporters?: number;
  }>;
  summary: {
    currentQuote: number;
    volume: number;
    buyUnits: number;
    uniqueSupporters: number;
    changePercent?: number;
  };
}

const rangeConfig = {
  "24h": { durationMs: 24 * 60 * 60 * 1000, bucketCount: 24 },
  "7d": { durationMs: 7 * 24 * 60 * 60 * 1000, bucketCount: 28 },
  "30d": { durationMs: 30 * 24 * 60 * 60 * 1000, bucketCount: 30 },
} as const;

export function isMarketHistoryRange(value: string): value is MarketHistoryRange {
  return value === "24h" || value === "7d" || value === "30d";
}

export async function getMarketHistory(
  identifier: string,
  range: MarketHistoryRange = "7d",
  now = new Date(),
): Promise<MarketHistoryResponse> {
  const character = await prisma.character.findFirst({
    where: { publishStatus: "PUBLISHED", OR: [{ id: identifier }, { slug: identifier }] },
    select: {
      id: true,
      basePrice: true,
      priceStep: true,
      unitsPerStep: true,
      circulatingUnits: true,
    },
  });
  if (!character) {
    throw new AppError("Character not found.", 404, "CHARACTER_NOT_FOUND");
  }

  const config = rangeConfig[range];
  const start = new Date(now.getTime() - config.durationMs);
  const [trades, previousTrade] = await Promise.all([
    prisma.trade.findMany({
      where: { characterId: character.id, createdAt: { gte: start, lte: now } },
      select: {
        side: true,
        quantity: true,
        totalCost: true,
        quoteBefore: true,
        quoteAfter: true,
        userId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.trade.findFirst({
      where: { characterId: character.id, createdAt: { lt: start } },
      select: { quoteAfter: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const bucketMs = config.durationMs / config.bucketCount;
  const grouped = Array.from({ length: config.bucketCount }, () => [] as typeof trades);
  for (const trade of trades) {
    const index = Math.min(
      config.bucketCount - 1,
      Math.max(0, Math.floor((trade.createdAt.getTime() - start.getTime()) / bucketMs)),
    );
    grouped[index].push(trade);
  }

  const currentQuote = getBuyQuote(character);
  const startQuote = previousTrade?.quoteAfter ?? trades[0]?.quoteBefore ?? currentQuote;
  let carryPrice = startQuote;
  const buckets = grouped.map((entries, index) => {
    const buySupporters = new Set<string>();
    let volume = 0;
    let buyUnits = 0;
    for (const trade of entries) {
      volume += trade.totalCost;
      carryPrice = trade.quoteAfter;
      if (trade.side === "BUY") {
        buyUnits += trade.quantity;
        buySupporters.add(trade.userId);
      }
    }
    return {
      timestamp: new Date(start.getTime() + index * bucketMs).toISOString(),
      price: carryPrice,
      volume,
      buyUnits,
      supporters: buySupporters.size,
    };
  });

  const uniqueSupporters = new Set(
    trades.filter((trade) => trade.side === "BUY").map((trade) => trade.userId),
  ).size;
  const volume = trades.reduce((total, trade) => total + trade.totalCost, 0);
  const buyUnits = trades.reduce(
    (total, trade) => total + (trade.side === "BUY" ? trade.quantity : 0),
    0,
  );

  return {
    range,
    buckets,
    summary: {
      currentQuote,
      volume,
      buyUnits,
      uniqueSupporters,
      changePercent:
        startQuote > 0
          ? Math.round(((currentQuote - startQuote) / startQuote) * 10_000) / 100
          : undefined,
    },
  };
}
