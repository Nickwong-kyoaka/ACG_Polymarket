import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn() },
  predictionMarket: { findFirst: vi.fn(), aggregate: vi.fn(), update: vi.fn() },
  predictionTreasury: { findUnique: vi.fn(), updateMany: vi.fn() },
  predictionPosition: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  predictionTrade: { findMany: vi.fn() }, resolutionChallenge: { count: vi.fn() },
  resolutionProposal: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  wallet: { updateMany: vi.fn() }, ledgerEntry: { create: vi.fn() }, notification: { createMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: (operation: (tx: typeof mocks) => unknown) => operation(mocks) } }));
import { finalizePredictionResolution, voidPredictionMarket } from "@/lib/prediction-market";

const now = new Date("2026-11-04T00:00:00Z");
const positions = [{ id: "position", userId: "winner", shares: 1, user: { wallet: { id: "wallet", softBalance: 0 } } }];

describe("prediction settlement and void notifications", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.findUnique.mockResolvedValue({ id: "admin", role: "ADMIN" });
    mocks.user.findMany.mockResolvedValue([
      { id: "winner", profile: { preferredLocale: "ZH_HANT" } },
      { id: "loser", profile: { preferredLocale: "EN" } },
      { id: "sold-out", profile: null },
    ]);
    mocks.predictionMarket.findFirst.mockResolvedValue({ id: "market", slug: "question", question: "Will the source confirm YES?", status: "PROPOSED", marketVersion: 3, reservedLiability: 1500, payoutPerShare: 100, resolutionSourceUrl: "https://example.test/source" });
    mocks.predictionMarket.aggregate.mockResolvedValueOnce({ _sum: { reservedLiability: 1500 } }).mockResolvedValueOnce({ _sum: { reservedLiability: 0 } });
    mocks.predictionTreasury.findUnique.mockResolvedValue({ id: "system", balance: 2000, reserved: 1500 });
    mocks.predictionTreasury.updateMany.mockResolvedValue({ count: 1 });
    mocks.predictionPosition.findMany.mockResolvedValue(positions);
    mocks.resolutionChallenge.count.mockResolvedValue(0);
    mocks.resolutionProposal.findFirst.mockResolvedValue({ id: "proposal", proposedById: "admin", outcomeId: "yes", outcome: { key: "YES" }, challenges: [], challengeEndsAt: new Date(now.getTime() - 1) });
    mocks.wallet.updateMany.mockResolvedValue({ count: 1 });
    mocks.notification.createMany.mockResolvedValue({ count: 3 });
  });

  it("notifies winners, losers and sold-out participants, with stable IDs and resolutions preference filtering", async () => {
    const result = await finalizePredictionResolution({ identifier: "market", adminUserId: "admin", now });
    expect(result).toMatchObject({ status: "RESOLVED", totalPayout: 100, treasury: { balance: 1900, reserved: 0 } });
    expect(mocks.user.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ predictionPositions: { some: { marketId: "market" } } }, { predictionTrades: { some: { marketId: "market" } } }],
        AND: [{ OR: [{ notificationPreference: { is: null } }, { notificationPreference: { is: { resolutions: true } } }] }],
      }, select: { id: true, profile: { select: { preferredLocale: true } } },
    });
    expect(mocks.notification.createMany).toHaveBeenCalledWith({ data: expect.arrayContaining([
      expect.objectContaining({ id: "prediction-settlement:market:RESOLVED:winner", userId: "winner", locale: "ZH_HANT", metadata: expect.objectContaining({ payout: 100, status: "RESOLVED" }) }),
      expect.objectContaining({ id: "prediction-settlement:market:RESOLVED:loser", userId: "loser", metadata: expect.objectContaining({ payout: 0 }) }),
      expect.objectContaining({ id: "prediction-settlement:market:RESOLVED:sold-out", userId: "sold-out", metadata: expect.objectContaining({ payout: 0 }) }),
    ]), skipDuplicates: true });
    expect(mocks.predictionMarket.aggregate).toHaveBeenCalledTimes(2);
  });

  it("preserves full fee-inclusive void refunds and notifies once when a void is replayed", async () => {
    mocks.predictionMarket.findFirst.mockResolvedValueOnce({ id: "market", slug: "question", question: "Question?", status: "LOCKED", reservedLiability: 1500, marketVersion: 3, resolutionSourceUrl: "https://example.test/source" });
    mocks.predictionTrade.findMany.mockResolvedValue([{ userId: "winner", side: "BUY", netAmount: 53 }, { userId: "winner", side: "SELL", netAmount: 49 }]);
    mocks.predictionPosition.findMany.mockResolvedValue([{ ...positions[0], shares: 0 }]);
    const request = { identifier: "market", adminUserId: "admin", reason: "The official source cannot objectively resolve this question.", now };
    expect(await voidPredictionMarket(request)).toMatchObject({ totalRefund: 4, treasury: { balance: 1996, reserved: 0 } });
    expect(mocks.notification.createMany).toHaveBeenCalledWith({ data: expect.arrayContaining([
      expect.objectContaining({ id: "prediction-settlement:market:VOID:winner", metadata: expect.objectContaining({ payout: 4, status: "VOID" }) }),
    ]), skipDuplicates: true });
    mocks.predictionMarket.findFirst.mockResolvedValueOnce({ id: "market", status: "VOID" });
    expect(await voidPredictionMarket(request)).toMatchObject({ alreadyVoided: true });
    expect(mocks.notification.createMany).toHaveBeenCalledOnce();
    expect(mocks.ledgerEntry.create).toHaveBeenCalledOnce();
  });

  it("does not emit notifications again on finalized market replay", async () => {
    await finalizePredictionResolution({ identifier: "market", adminUserId: "admin", now });
    mocks.predictionMarket.findFirst.mockResolvedValueOnce({ id: "market", status: "RESOLVED", winningOutcomeId: "yes" });
    expect(await finalizePredictionResolution({ identifier: "market", adminUserId: "admin", now })).toMatchObject({ alreadyFinalized: true });
    expect(mocks.notification.createMany).toHaveBeenCalledOnce();
  });

  it("emits no notifications when every participant opted out", async () => {
    mocks.user.findMany.mockResolvedValue([]);
    await finalizePredictionResolution({ identifier: "market", adminUserId: "admin", now });
    expect(mocks.notification.createMany).not.toHaveBeenCalled();
    expect(mocks.ledgerEntry.create).toHaveBeenCalledOnce();
  });
});
