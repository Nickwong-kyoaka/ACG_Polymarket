import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  predictionMarket: { findFirst: vi.fn(), update: vi.fn() },
  resolutionChallenge: { findUnique: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
  resolutionProposal: { update: vi.fn(), findFirst: vi.fn() },
  analyticsEvent: { create: vi.fn() }, notification: { create: vi.fn(), createMany: vi.fn() },
  notificationPreference: { findUnique: vi.fn() }, predictionPosition: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: (operation: (tx: typeof mocks) => unknown) => operation(mocks) } }));

import { finalizePredictionResolution, reviewPredictionChallenge, syncPredictionReminders } from "@/lib/prediction-market";

const review = {
  identifier: "market", challengeId: "challenge", adminUserId: "reviewer", accepted: false,
  evidenceUrl: "https://example.test/review", reasoning: "The source provides conclusive dated evidence.",
  now: new Date("2026-11-04T00:00:00Z"),
};

describe("explicit prediction challenge review", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.findUnique.mockResolvedValue({ id: "reviewer", role: "ADMIN" });
    mocks.predictionMarket.findFirst.mockResolvedValue({ id: "market", slug: "market", status: "CHALLENGE" });
    mocks.resolutionChallenge.findUnique.mockResolvedValue({
      id: "challenge", proposalId: "proposal", userId: "challenger", accepted: null,
      proposal: { marketId: "market", proposedById: "proposer", status: "CHALLENGED" },
    });
    mocks.resolutionChallenge.updateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects one challenge with evidence, without changing any other challenge or proposal", async () => {
    await expect(reviewPredictionChallenge(review)).resolves.toMatchObject({ accepted: false, challengeId: "challenge" });
    expect(mocks.resolutionChallenge.updateMany).toHaveBeenCalledWith({ where: { id: "challenge", accepted: null }, data: { accepted: false } });
    expect(mocks.resolutionProposal.update).not.toHaveBeenCalled();
    expect(mocks.analyticsEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      name: "prediction.challenge.review", metadata: expect.objectContaining({ challengeId: "challenge", adminUserId: "reviewer", evidenceUrl: review.evidenceUrl, reasoning: review.reasoning }),
    }) }));
    expect(mocks.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "challenger" }) }));
  });

  it("accepts one challenge, invalidates the original proposal and locks for correction", async () => {
    await reviewPredictionChallenge({ ...review, accepted: true });
    expect(mocks.resolutionProposal.update).toHaveBeenCalledWith({ where: { id: "proposal" }, data: { status: "VOIDED", resolvedAt: review.now } });
    expect(mocks.predictionMarket.update).toHaveBeenCalledWith({ where: { id: "market" }, data: { status: "LOCKED", challengeEndsAt: null, marketVersion: { increment: 1 } } });
    expect(mocks.resolutionChallenge.updateMany).toHaveBeenCalledTimes(1);
  });

  it.each(["proposer", "challenger"])("does not let %s act as independent reviewer", async (adminUserId) => {
    await expect(reviewPredictionChallenge({ ...review, adminUserId })).rejects.toMatchObject({ status: 403 });
    expect(mocks.resolutionChallenge.updateMany).not.toHaveBeenCalled();
  });

  it("does not overwrite a completed decision", async () => {
    const existing = await mocks.resolutionChallenge.findUnique();
    mocks.resolutionChallenge.findUnique.mockResolvedValue({ ...existing, accepted: true });
    await expect(reviewPredictionChallenge(review)).rejects.toMatchObject({ code: "CHALLENGE_REVIEWED" });
    expect(mocks.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("blocks finalization with pending challenges instead of automatically dismissing them", async () => {
    mocks.resolutionProposal.findFirst.mockResolvedValue({
      id: "proposal", outcomeId: "yes", outcome: { key: "YES" }, proposedById: "proposer",
      challengeEndsAt: new Date("2026-11-03T00:00:00Z"), challenges: [{ accepted: null }],
    });
    mocks.resolutionChallenge.count.mockResolvedValue(1);
    await expect(finalizePredictionResolution({ identifier: "market", adminUserId: "reviewer", now: review.now })).rejects.toMatchObject({ code: "CHALLENGES_PENDING" });
    expect(mocks.resolutionChallenge.updateMany).not.toHaveBeenCalled();
  });
});

describe("prediction closing reminders", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.notificationPreference.findUnique.mockResolvedValue({ predictionClosing: true });
    mocks.predictionPosition.findMany.mockResolvedValue([{ market: { id: "market", slug: "market", question: "Question?", closesAt: new Date("2026-11-04T12:00:00Z") } }]);
    mocks.notification.createMany.mockResolvedValue({ count: 1 });
  });

  it("filters out expired, settled, and sold-out positions and uses stable deduplication IDs", async () => {
    await syncPredictionReminders("user", review.now);
    await syncPredictionReminders("user", review.now);
    expect(mocks.predictionPosition.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      userId: "user", shares: { gt: 0 }, settledAt: null,
      market: { status: "OPEN", closesAt: { gt: review.now, lte: new Date("2026-11-05T00:00:00Z") } },
    } }));
    expect(mocks.notification.createMany.mock.calls[0][0]).toEqual(mocks.notification.createMany.mock.calls[1][0]);
    expect(mocks.notification.createMany.mock.calls[0][0]).toMatchObject({ skipDuplicates: true });
  });

  it("honors the user's closing reminder opt-out", async () => {
    mocks.notificationPreference.findUnique.mockResolvedValue({ predictionClosing: false });
    await expect(syncPredictionReminders("user", review.now)).resolves.toEqual({ created: 0 });
    expect(mocks.predictionPosition.findMany).not.toHaveBeenCalled();
    expect(mocks.notification.createMany).not.toHaveBeenCalled();
  });
});
