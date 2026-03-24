import { describe, expect, it } from "vitest";
import { calculateBuyBatchCost, calculateSellBatchReturn, getBuyQuote, getSellQuote } from "@/lib/market";
import { seedSnapshot } from "@/data/seed";

describe("market pricing", () => {
  const akari = seedSnapshot.characters.find((character) => character.id === "char-akari")!;

  it("computes a rising buy quote from circulating supply", () => {
    expect(getBuyQuote(akari)).toBe(25);
  });

  it("computes a discounted sell quote", () => {
    expect(getSellQuote(akari)).toBe(23);
  });

  it("calculates batch buy cost without exceeding the per-step mechanic", () => {
    const result = calculateBuyBatchCost(akari, 3);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.unitPrice).toBeGreaterThanOrEqual(getBuyQuote(akari));
  });

  it("calculates batch sell return", () => {
    const result = calculateSellBatchReturn(akari, 2);
    expect(result.totalReturn).toBeGreaterThan(0);
    expect(result.unitPrice).toBeLessThanOrEqual(getSellQuote(akari));
  });
});
