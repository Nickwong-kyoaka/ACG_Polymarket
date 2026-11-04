import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  predictionMarket: { findFirst: vi.fn(), aggregate: vi.fn(), updateMany: vi.fn() },
  predictionTreasury: { findUnique: vi.fn(), updateMany: vi.fn() },
  predictionTrade: { count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn(), create: vi.fn() },
  predictionPosition: { findMany: vi.fn(), upsert: vi.fn() },
  predictionOutcome: { updateMany: vi.fn() }, wallet: { findUnique: vi.fn(), updateMany: vi.fn() },
  ledgerEntry: { create: vi.fn() }, notification: { create: vi.fn() },
  idempotencyRecord: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
const transaction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { ...mocks, $transaction: transaction } }));
import { buyPredictionShares, createSignedPredictionQuote } from "@/lib/prediction-market";

const now = new Date("2026-11-04T00:00:00Z");
const market = {
  id: "market", slug: "market", status: "OPEN", closesAt: new Date("2026-11-05T00:00:00Z"),
  marketVersion: 1, reservedLiability: 1387, yesShares: 0, noShares: 0, liquidityParameter: 20, payoutPerShare: 100,
  outcomes: [{ id: "yes", key: "YES", label: "Yes", sharesOutstanding: 0 }, { id: "no", key: "NO", label: "No", sharesOutstanding: 0 }],
};
function buyRequest() {
  const quote = createSignedPredictionQuote({ market, outcomeId: "yes", outcome: "YES", side: "BUY", quantity: 1, userId: "reader", walletBalance: 1000, positionShares: 0, totalMarketPositionShares: 0, now });
  return { identifier: "market", userId: "reader", outcome: "YES", quantity: 1, quoteToken: quote.quoteToken, idempotencyKey: "funded-trade-request", now };
}

describe("atomic prediction trade funding", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    transaction.mockImplementation(async (operation) => operation(mocks));
    mocks.user.findUnique.mockResolvedValue({ id: "reader" });
    mocks.predictionMarket.findFirst.mockResolvedValue(market);
    mocks.predictionMarket.aggregate.mockResolvedValueOnce({ _sum: { reservedLiability: 1387 } }).mockResolvedValueOnce({ _sum: { reservedLiability: 1389 } });
    mocks.predictionMarket.updateMany.mockResolvedValue({ count: 1 });
    mocks.predictionTreasury.findUnique.mockResolvedValue({ id: "system", balance: 2000, reserved: 1387 });
    mocks.predictionTreasury.updateMany.mockResolvedValue({ count: 1 });
    mocks.predictionTrade.aggregate.mockResolvedValue({ _sum: { grossAmount: 0 } });
    mocks.predictionTrade.count.mockResolvedValue(0);
    mocks.predictionTrade.groupBy.mockResolvedValue([]);
    mocks.predictionTrade.create.mockImplementation(async ({ data }) => ({ ...data, id: "trade", createdAt: now }));
    mocks.predictionPosition.findMany.mockResolvedValue([]);
    mocks.predictionPosition.upsert.mockResolvedValue({ outcomeId: "yes", shares: 1, totalCost: 53 });
    mocks.predictionOutcome.updateMany.mockResolvedValue({ count: 1 });
    mocks.wallet.findUnique.mockResolvedValue({ id: "wallet", softBalance: 1000 });
    mocks.wallet.updateMany.mockResolvedValue({ count: 1 });
    mocks.idempotencyRecord.findUnique.mockResolvedValue(null);
    mocks.idempotencyRecord.create.mockResolvedValue({ id: "request" });
  });

  it("reserves both records and version in the same serializable mutation, with only principal credited", async () => {
    const result = await buyPredictionShares(buyRequest());
    expect(result).toMatchObject({ treasury: { balance: 2051, reserved: 1389 }, market: { marketVersion: 2, reservedLiability: 1389 }, wallet: { softBalance: 947 } });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "Serializable" }));
    expect(mocks.predictionTreasury.updateMany).toHaveBeenCalledWith({ where: { id: "system", balance: 2000, reserved: 1387 }, data: { balance: 2051, reserved: 1389 } });
    expect(mocks.predictionMarket.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ marketVersion: 1, reservedLiability: 1387 }),
      data: expect.objectContaining({ marketVersion: { increment: 1 }, reservedLiability: 1389 }),
    }));
    expect(mocks.predictionMarket.aggregate).toHaveBeenCalledTimes(2);
  });

  it("rejects insufficient fee backing before wallet, supply, version, or treasury writes", async () => {
    mocks.predictionTreasury.findUnique.mockResolvedValue({ id: "system", balance: 1388, reserved: 1387 });
    await expect(buyPredictionShares(buyRequest())).rejects.toMatchObject({ code: "TREASURY_RESERVE_INSUFFICIENT" });
    expect(mocks.predictionTreasury.updateMany).not.toHaveBeenCalled();
    expect(mocks.predictionMarket.updateMany).not.toHaveBeenCalled();
    expect(mocks.wallet.updateMany).not.toHaveBeenCalled();
    expect(mocks.predictionTrade.create).not.toHaveBeenCalled();
  });

  it("does not trade across a reserve reconciliation failure", async () => {
    mocks.predictionMarket.aggregate.mockReset().mockResolvedValue({ _sum: { reservedLiability: 1386 } });
    await expect(buyPredictionShares(buyRequest())).rejects.toMatchObject({ code: "TREASURY_RECONCILIATION_FAILED" });
    expect(mocks.predictionTreasury.updateMany).not.toHaveBeenCalled();
    expect(mocks.wallet.updateMany).not.toHaveBeenCalled();
  });
});
