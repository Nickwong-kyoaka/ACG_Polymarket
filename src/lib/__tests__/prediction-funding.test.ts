import { describe, expect, it } from "vitest";
import { calculatePredictionQuote, calculatePredictionTradeFunding, calculateVoidRefunds } from "@/lib/prediction-market";

const market = { id: "market", marketVersion: 1, yesShares: 0, noShares: 0, liquidityParameter: 20, payoutPerShare: 100, reservedLiability: 1387 };
const buy = calculatePredictionQuote({ market, outcome: "YES", side: "BUY", quantity: 1 });

describe("funded fee-inclusive void commitments", () => {
  it("burns the fee while reserving equal existing treasury capital", () => {
    expect(calculatePredictionTradeFunding({
      treasury: { balance: 2000, reserved: 1387 }, market, trade: buy, voidLiability: 53,
    })).toEqual({ balance: 2051, reserved: 1389, marketReservedLiability: 1389, reserveIncrease: 2 });
  });

  it("rejects an unfunded refundable fee even if the buy would bring in principal", () => {
    expect(() => calculatePredictionTradeFunding({
      treasury: { balance: 1388, reserved: 1387 }, market, trade: buy, voidLiability: 53,
    })).toThrowError(expect.objectContaining({ code: "TREASURY_RESERVE_INSUFFICIENT" }));
  });

  it("rejects sells that would consume another market's reserved capital", () => {
    const sell = calculatePredictionQuote({ market: { ...market, yesShares: 1 }, outcome: "YES", side: "SELL", quantity: 1 });
    expect(() => calculatePredictionTradeFunding({
      treasury: { balance: 4000, reserved: 3987 }, market, trade: sell, voidLiability: 4,
    })).toThrowError(expect.objectContaining({ code: "TREASURY_RESERVE_INSUFFICIENT" }));
  });

  it("retains historical funded fee reserves instead of resetting or charging them again", () => {
    const funding = calculatePredictionTradeFunding({
      treasury: { balance: 6000, reserved: 4000 }, market: { ...market, reservedLiability: 2500 }, trade: buy, voidLiability: 500,
    });
    expect(funding).toEqual({ balance: 6051, reserved: 4002, marketReservedLiability: 2502, reserveIncrease: 2 });
  });

  it("backs the full per-user clamped void liability, not just aggregate inflow", () => {
    const refunds = calculateVoidRefunds([
      { userId: "loser", side: "BUY", netAmount: 2500 },
      { userId: "profitable", side: "BUY", netAmount: 50 },
      { userId: "profitable", side: "SELL", netAmount: 500 },
    ]);
    expect(refunds).toEqual([{ userId: "loser", amount: 2500 }]);
    expect(calculatePredictionTradeFunding({
      treasury: { balance: 6000, reserved: 2387 }, market, trade: buy, voidLiability: 2500,
    })).toMatchObject({ marketReservedLiability: 2500, reserved: 3500 });
  });

  it("never reuses winning payout collateral as free reserve for another market", () => {
    expect(calculatePredictionTradeFunding({
      treasury: { balance: 6000, reserved: 2387 }, market,
      trade: { ...buy, yesSharesAfter: 30 }, voidLiability: 500,
    })).toMatchObject({ marketReservedLiability: 3000, reserved: 4000 });
  });

  it("keeps long-running churn's fee-inclusive refunds fully funded and releases the market reserve at void", () => {
    let treasury = { balance: 10000, reserved: 1387 + 700 };
    let activeMarket = { ...market };
    const trades: Array<{ userId: string; side: "BUY" | "SELL"; netAmount: number }> = [];
    let totalFees = 0;
    let walletFlow = 0;
    let peakVoidLiability = 0;
    for (let cycle = 0; cycle < 1500; cycle++) {
      for (const side of ["BUY", "SELL"] as const) {
        const trade = calculatePredictionQuote({ market: activeMarket, outcome: "YES", side, quantity: 1 });
        trades.push({ userId: "churn", side, netAmount: trade.netAmount });
        const voidLiability = calculateVoidRefunds(trades).reduce((sum, refund) => sum + refund.amount, 0);
        const next = calculatePredictionTradeFunding({ treasury, market: activeMarket, trade, voidLiability });
        peakVoidLiability = Math.max(peakVoidLiability, voidLiability);
        expect(next.marketReservedLiability).toBe(Math.max(
          activeMarket.reservedLiability + trade.feeAmount,
          Math.max(trade.yesSharesAfter, trade.noSharesAfter) * activeMarket.payoutPerShare,
          voidLiability,
        ));
        totalFees += trade.feeAmount;
        walletFlow += side === "BUY" ? -trade.netAmount : trade.netAmount;
        treasury = { balance: next.balance, reserved: next.reserved };
        activeMarket = { ...activeMarket, reservedLiability: next.marketReservedLiability, yesShares: trade.yesSharesAfter, noShares: trade.noSharesAfter };
        expect(treasury.balance).toBeGreaterThanOrEqual(treasury.reserved);
      }
    }
    const refund = calculateVoidRefunds(trades)[0].amount;
    expect(totalFees).toBe(4500);
    expect(refund).toBe(6000);
    expect(activeMarket.reservedLiability).toBeGreaterThanOrEqual(1387 + totalFees);
    expect(activeMarket.reservedLiability).toBeGreaterThanOrEqual(refund);
    expect(activeMarket.reservedLiability).toBeGreaterThanOrEqual(peakVoidLiability);
    expect(treasury.balance + walletFlow).toBe(10000 - totalFees);
    expect(treasury.balance - refund).toBeGreaterThanOrEqual(700);
    expect(treasury.reserved - activeMarket.reservedLiability).toBe(700);
  });
});
