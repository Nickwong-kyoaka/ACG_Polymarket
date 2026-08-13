import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findCharacter: vi.fn(),
  findTrades: vi.fn(),
  findPreviousTrade: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    character: { findFirst: mocks.findCharacter },
    trade: { findMany: mocks.findTrades, findFirst: mocks.findPreviousTrade },
  },
}));

import { getMarketHistory } from "@/lib/market-history";

describe("market history aggregation", () => {
  beforeEach(() => {
    mocks.findCharacter.mockReset();
    mocks.findTrades.mockReset();
    mocks.findPreviousTrade.mockReset();
  });

  it("returns the stable range, buckets, and summary JSON contract", async () => {
    const now = new Date("2026-08-14T00:00:00.000Z");
    mocks.findCharacter.mockResolvedValue({
      id: "char-1",
      basePrice: 20,
      priceStep: 5,
      unitsPerStep: 100,
      circulatingUnits: 100,
    });
    mocks.findPreviousTrade.mockResolvedValue({ quoteAfter: 20 });
    mocks.findTrades.mockResolvedValue([
      {
        side: "BUY",
        quantity: 2,
        totalCost: 45,
        quoteBefore: 20,
        quoteAfter: 25,
        userId: "supporter-1",
        createdAt: new Date("2026-08-13T23:30:00.000Z"),
      },
    ]);

    const history = await getMarketHistory("char-1", "24h", now);
    expect(history.range).toBe("24h");
    expect(history.buckets).toHaveLength(24);
    expect(history.buckets.at(-1)).toMatchObject({
      timestamp: "2026-08-13T23:00:00.000Z",
      price: 25,
      volume: 45,
      buyUnits: 2,
      supporters: 1,
    });
    expect(history.summary).toEqual({
      currentQuote: 25,
      volume: 45,
      buyUnits: 2,
      uniqueSupporters: 1,
      changePercent: 25,
    });
  });
});
