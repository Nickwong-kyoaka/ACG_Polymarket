import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/api";
import {
  MARKET_QUOTE_TTL_MS,
  createSignedMarketQuote,
  verifySignedMarketQuote,
} from "@/lib/market-quote";

const character = {
  id: "char-step",
  basePrice: 20,
  priceStep: 5,
  unitsPerStep: 100,
  circulatingUnits: 99,
  marketVersion: 7,
};

describe("signed market quotes", () => {
  it("returns the documented 30-second batch execution preview", () => {
    const now = new Date("2026-08-14T00:00:00.000Z");
    const quote = createSignedMarketQuote({
      character,
      side: "BUY",
      quantity: 2,
      userId: "user-1",
      walletBalance: 100,
      positionUnits: 0,
      now,
      secret: "test-secret",
    });

    expect(quote).toMatchObject({
      characterId: "char-step",
      side: "BUY",
      quantity: 2,
      currency: "SUP",
      marketVersion: 7,
      supplyBefore: 99,
      supplyAfter: 101,
      total: 45,
      averagePrice: 23,
      firstPrice: 20,
      lastPrice: 25,
      quoteBefore: 20,
      quoteAfter: 25,
      affordable: true,
      availableUnits: 0,
    });
    expect(new Date(quote.expiresAt).getTime() - now.getTime()).toBe(MARKET_QUOTE_TTL_MS);
    expect(quote.quoteToken).toContain(".");
  });

  it("rejects tampering, expiry, and stale market versions", () => {
    const now = new Date("2026-08-14T00:00:00.000Z");
    const quote = createSignedMarketQuote({
      character,
      side: "BUY",
      quantity: 2,
      userId: "user-1",
      walletBalance: 100,
      positionUnits: 0,
      now,
      secret: "test-secret",
    });
    const verify = (overrides: Partial<Parameters<typeof verifySignedMarketQuote>[0]> = {}) =>
      verifySignedMarketQuote({
        token: quote.quoteToken,
        character,
        side: "BUY",
        quantity: 2,
        userId: "user-1",
        now: new Date(now.getTime() + 1_000),
        secret: "test-secret",
        ...overrides,
      });

    expect(() => verify()).not.toThrow();
    expect(() => verify({ token: `${quote.quoteToken}x` })).toThrowError(AppError);
    expect(() => verify({ now: new Date(now.getTime() + MARKET_QUOTE_TTL_MS) })).toThrowError(
      expect.objectContaining({ code: "QUOTE_EXPIRED", status: 409 }),
    );
    expect(() => verify({ character: { ...character, marketVersion: 8 } })).toThrowError(
      expect.objectContaining({ code: "QUOTE_CHANGED", status: 409 }),
    );
  });
});
