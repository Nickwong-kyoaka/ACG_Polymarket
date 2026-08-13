import { describe, expect, it } from "vitest";
import { calculateBuyBatchCost, calculateSellBatchReturn, getBuyQuote, getSellQuote } from "@/lib/market";

describe("market pricing", () => {
  const character = {
    basePrice: 20,
    priceStep: 5,
    unitsPerStep: 100,
    circulatingUnits: 118,
  };

  it("computes a rising buy quote from circulating supply", () => {
    expect(getBuyQuote(character)).toBe(25);
  });

  it("computes a discounted sell quote", () => {
    expect(getSellQuote(character)).toBe(23);
  });

  it("calculates batch buy cost without exceeding the per-step mechanic", () => {
    const result = calculateBuyBatchCost(character, 3);
    expect(result).toMatchObject({
      totalCost: 75,
      firstUnitPrice: 25,
      lastUnitPrice: 25,
      averageUnitPrice: 25,
      supplyBefore: 118,
      supplyAfter: 121,
    });
  });

  it("calculates batch sell return", () => {
    const result = calculateSellBatchReturn(character, 2);
    expect(result).toMatchObject({
      totalReturn: 46,
      firstUnitPrice: 23,
      lastUnitPrice: 23,
      averageUnitPrice: 23,
      supplyBefore: 118,
      supplyAfter: 116,
    });
  });

  it("prices every unit exactly across a supply step", () => {
    const character = { basePrice: 20, priceStep: 5, unitsPerStep: 100, circulatingUnits: 99 };
    expect(calculateBuyBatchCost(character, 2)).toMatchObject({
      totalCost: 45,
      firstUnitPrice: 20,
      lastUnitPrice: 25,
      quoteBefore: 20,
      quoteAfter: 25,
    });
  });

  it("never creates SUP through an immediate batch buy and sell cycle", () => {
    const before = { basePrice: 20, priceStep: 5, unitsPerStep: 100, circulatingUnits: 99 };
    const buy = calculateBuyBatchCost(before, 2);
    const sell = calculateSellBatchReturn({ ...before, circulatingUnits: buy.supplyAfter }, 2);
    expect(sell.totalReturn).toBe(42);
    expect(sell.totalReturn).toBeLessThan(buy.totalCost);
  });
});
