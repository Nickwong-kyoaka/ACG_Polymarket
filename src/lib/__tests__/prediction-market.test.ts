import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/api";
import {
  PREDICTION_QUOTE_TTL_MS,
  calculateLmsrCost,
  calculateOutcomeProbabilityBps,
  calculatePredictionMarketReserve,
  calculatePredictionQuote,
  calculateVoidRefunds,
  createSignedPredictionQuote,
  effectivePredictionStatus,
  verifySignedPredictionQuote,
} from "@/lib/prediction-market";

const emptyMarket = {
  id: "prediction-market-1",
  marketVersion: 3,
  yesShares: 0,
  noShares: 0,
  liquidityParameter: 20,
  payoutPerShare: 100,
};

describe("V3 LMSR prediction market", () => {
  it("starts at 50/50 and reserves the bounded binary LMSR loss", () => {
    expect(calculateOutcomeProbabilityBps(0, 0, "YES")).toBe(5_000);
    expect(calculateOutcomeProbabilityBps(0, 0, "NO")).toBe(5_000);
    expect(calculatePredictionMarketReserve()).toBe(1_387);
    expect(calculateLmsrCost(0, 0)).toBeCloseTo(20 * 100 * Math.log(2), 8);
  });

  it("quotes conservative integer SUP amounts with the 2% minimum fee", () => {
    const buy = calculatePredictionQuote({
      market: emptyMarket,
      outcome: "YES",
      side: "BUY",
      quantity: 1,
    });
    expect(buy).toMatchObject({
      grossAmount: 51,
      feeAmount: 2,
      netAmount: 53,
      probabilityBeforeBps: 5_000,
      probabilityAfterBps: 5_125,
      yesSharesAfter: 1,
      noSharesAfter: 0,
    });

    const sell = calculatePredictionQuote({
      market: { ...emptyMarket, yesShares: 1 },
      outcome: "YES",
      side: "SELL",
      quantity: 1,
    });
    expect(sell).toMatchObject({
      grossAmount: 50,
      feeAmount: 1,
      netAmount: 49,
      probabilityBeforeBps: 5_125,
      probabilityAfterBps: 5_000,
    });
  });

  it("enforces three shares per order and prevents negative outcome supply", () => {
    expect(() =>
      calculatePredictionQuote({
        market: emptyMarket,
        outcome: "NO",
        side: "BUY",
        quantity: 4,
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_QUANTITY", status: 422 }));
    expect(() =>
      calculatePredictionQuote({
        market: emptyMarket,
        outcome: "NO",
        side: "SELL",
        quantity: 1,
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_SUPPLY", status: 422 }));
  });

  it.each([80, 100, 1000])("rejects sells whose gross cannot cover the fee (opposite supply %i)", (noShares) => {
    expect(() => calculatePredictionQuote({
      market: { ...emptyMarket, yesShares: 1, noShares }, outcome: "YES", side: "SELL", quantity: 1,
    })).toThrowError(expect.objectContaining({ code: "SELL_BELOW_FEE", status: 422 }));
  });

  it("reconciles conservative round-trip principal and burned fees", () => {
    const buy = calculatePredictionQuote({ market: emptyMarket, outcome: "YES", side: "BUY", quantity: 1 });
    const sell = calculatePredictionQuote({ market: { ...emptyMarket, yesShares: 1 }, outcome: "YES", side: "SELL", quantity: 1 });
    const walletDelta = -buy.netAmount + sell.netAmount;
    const treasuryDelta = buy.grossAmount - sell.grossAmount;
    expect(walletDelta).toBe(-4);
    expect(treasuryDelta).toBe(1);
    expect(walletDelta + treasuryDelta).toBe(-buy.feeAmount - sell.feeAmount);
  });

  it("treats an expired OPEN market as locked at the exact deadline, without changing terminal states", () => {
    const closesAt = new Date("2026-01-01T00:00:00Z");
    expect(effectivePredictionStatus({ status: "OPEN", closesAt }, new Date(closesAt.getTime() - 1))).toBe("OPEN");
    expect(effectivePredictionStatus({ status: "OPEN", closesAt }, closesAt)).toBe("LOCKED");
    for (const status of ["DRAFT", "LOCKED", "PROPOSED", "CHALLENGE", "RESOLVED", "VOID"]) {
      expect(effectivePredictionStatus({ status, closesAt }, closesAt)).toBe(status);
    }
  });

  it("signs a user, outcome, inventory, and market version for exactly 30 seconds", () => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const quote = createSignedPredictionQuote({
      market: emptyMarket,
      outcomeId: "outcome-yes",
      outcome: "YES",
      side: "BUY",
      quantity: 1,
      userId: "user-1",
      walletBalance: 300,
      positionShares: 0,
      totalMarketPositionShares: 0,
      dailyGrossBuySpent: 0,
      now,
      secret: "prediction-test-secret",
    });
    expect(new Date(quote.expiresAt).getTime() - now.getTime()).toBe(
      PREDICTION_QUOTE_TTL_MS,
    );
    expect(quote.affordable).toBe(true);
    expect(() =>
      verifySignedPredictionQuote({
        token: quote.quoteToken,
        market: emptyMarket,
        outcomeId: "outcome-yes",
        outcome: "YES",
        side: "BUY",
        quantity: 1,
        userId: "user-1",
        now: new Date(now.getTime() + 1_000),
        secret: "prediction-test-secret",
      }),
    ).not.toThrow();
    expect(() =>
      verifySignedPredictionQuote({
        token: quote.quoteToken,
        market: { ...emptyMarket, marketVersion: 4 },
        outcomeId: "outcome-yes",
        outcome: "YES",
        side: "BUY",
        quantity: 1,
        userId: "user-1",
        now: new Date(now.getTime() + 1_000),
        secret: "prediction-test-secret",
      }),
    ).toThrowError(expect.objectContaining({ code: "QUOTE_CHANGED", status: 409 }));
    expect(() =>
      verifySignedPredictionQuote({
        token: `${quote.quoteToken}x`,
        market: emptyMarket,
        outcomeId: "outcome-yes",
        outcome: "YES",
        side: "BUY",
        quantity: 1,
        userId: "user-1",
        now: new Date(now.getTime() + 1_000),
        secret: "prediction-test-secret",
      }),
    ).toThrowError(AppError);
    expect(() =>
      verifySignedPredictionQuote({
        token: quote.quoteToken,
        market: emptyMarket,
        outcomeId: "outcome-yes",
        outcome: "YES",
        side: "BUY",
        quantity: 1,
        userId: "user-1",
        now: new Date(now.getTime() + PREDICTION_QUOTE_TTL_MS),
        secret: "prediction-test-secret",
      }),
    ).toThrowError(expect.objectContaining({ code: "QUOTE_EXPIRED", status: 409 }));
  });

  it("refunds each voided user's positive net historical loss including fees", () => {
    expect(
      calculateVoidRefunds([
        { userId: "loss", side: "BUY", netAmount: 53 },
        { userId: "loss", side: "SELL", netAmount: 49 },
        { userId: "open", side: "BUY", netAmount: 100 },
        { userId: "gain", side: "BUY", netAmount: 40 },
        { userId: "gain", side: "SELL", netAmount: 60 },
      ]),
    ).toEqual([
      { userId: "loss", amount: 4 },
      { userId: "open", amount: 100 },
    ]);
  });
});
