import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  buyPredictionShares,
  challengePredictionResolution,
  createPredictionEvent,
  createPredictionMarket,
  finalizePredictionResolution,
  lockPredictionMarket,
  openPredictionMarket,
  proposePredictionResolution,
  requestPredictionQuote,
  reviewPredictionChallenge,
  sellPredictionShares,
  updatePredictionMarketRules,
  voidPredictionMarket,
} from "@/lib/prediction-market";

const runDatabaseTests = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!runDatabaseTests)("V3 prediction transaction integration", () => {
  const suffix = randomUUID().slice(0, 8);
  const adminOneId = `prediction-admin-one-${suffix}`;
  const adminTwoId = `prediction-admin-two-${suffix}`;
  const userId = `prediction-user-${suffix}`;
  const challengerId = `prediction-challenger-${suffix}`;
  const eventSlug = `prediction-event-${suffix}`;
  const marketSlug = `prediction-market-${suffix}`;
  const voidMarketSlug = `prediction-void-${suffix}`;
  let treasuryBefore: { balance: number; reserved: number } | null = null;

  async function createFundedUser(id: string, role: "USER" | "ADMIN", balance = 1_000) {
    const user = await prisma.user.create({ data: { id, name: id, role } });
    const wallet = await prisma.wallet.create({
      data: { userId: id, softBalance: balance, premiumBalance: 0 },
    });
    await prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        currencyType: "SOFT",
        delta: balance,
        balanceAfter: balance,
        referenceType: "STARTER_GRANT",
        referenceId: user.id,
        idempotencyKey: `prediction-fixture:${id}`,
      },
    });
  }

  beforeAll(async () => {
    const existingTreasury = await prisma.predictionTreasury.findUnique({
      where: { id: "system" },
    });
    treasuryBefore = existingTreasury
      ? { balance: existingTreasury.balance, reserved: existingTreasury.reserved }
      : null;
    await prisma.predictionTreasury.upsert({
      where: { id: "system" },
      create: { id: "system", balance: 100_000, reserved: 0 },
      update: {
        balance: Math.max(existingTreasury?.balance ?? 0, existingTreasury?.reserved ?? 0) + 100_000,
      },
    });
    await Promise.all([
      createFundedUser(adminOneId, "ADMIN"),
      createFundedUser(adminTwoId, "ADMIN"),
      createFundedUser(userId, "USER"),
      createFundedUser(challengerId, "USER"),
    ]);
    await createPredictionEvent({
      slug: eventSlug,
      category: "seasonal",
      title: "Integration event",
      description: "A deterministic integration fixture for prediction markets.",
      adminUserId: adminOneId,
    });
    await createPredictionMarket({
      eventId: eventSlug,
      slug: marketSlug,
      question: "Will the integration fixture resolve YES?",
      description: "Exercises quote, trade, challenge, and settlement behavior.",
      resolutionSourceUrl: "https://example.com/integration-result",
      resolutionSourceLabel: "Integration source",
      edgeCaseRules: "The fixture resolves from the exact source URL after it is locked.",
      closesAt: new Date(Date.now() + 60 * 60 * 1_000),
      adminUserId: adminOneId,
    });
    await openPredictionMarket(marketSlug, adminOneId);
  });

  afterAll(async () => {
    await prisma.predictionEvent.deleteMany({ where: { slug: eventSlug } });
    await prisma.user.deleteMany({
      where: { id: { in: [adminOneId, adminTwoId, userId, challengerId] } },
    });
    if (treasuryBefore) {
      await prisma.predictionTreasury.update({
        where: { id: "system" },
        data: treasuryBefore,
      });
    } else {
      await prisma.predictionTreasury.deleteMany({ where: { id: "system" } });
    }
  });

  it("executes and replays trades, rejects stale quotes, and reconciles ledger balances", async () => {
    const treasuryStart = await prisma.predictionTreasury.findUniqueOrThrow({ where: { id: "system" } });
    const firstQuote = await requestPredictionQuote({
      identifier: marketSlug,
      outcome: "YES",
      side: "BUY",
      quantity: 1,
      userId,
    });
    const first = await buyPredictionShares({
      identifier: marketSlug,
      outcome: "YES",
      quantity: 1,
      quoteToken: firstQuote.quoteToken,
      userId,
      idempotencyKey: `prediction-buy-${suffix}`,
    });
    const replay = await buyPredictionShares({
      identifier: marketSlug,
      outcome: "YES",
      quantity: 1,
      quoteToken: firstQuote.quoteToken,
      userId,
      idempotencyKey: `prediction-buy-${suffix}`,
    });
    expect(replay.trade.id).toBe(first.trade.id);

    const staleQuote = await requestPredictionQuote({
      identifier: marketSlug,
      outcome: "YES",
      side: "BUY",
      quantity: 1,
      userId,
    });
    const freshQuote = await requestPredictionQuote({
      identifier: marketSlug,
      outcome: "YES",
      side: "BUY",
      quantity: 1,
      userId,
    });
    await buyPredictionShares({
      identifier: marketSlug,
      outcome: "YES",
      quantity: 1,
      quoteToken: freshQuote.quoteToken,
      userId,
      idempotencyKey: `prediction-fresh-${suffix}`,
    });
    await expect(
      buyPredictionShares({
        identifier: marketSlug,
        outcome: "YES",
        quantity: 1,
        quoteToken: staleQuote.quoteToken,
        userId,
        idempotencyKey: `prediction-stale-${suffix}`,
      }),
    ).rejects.toMatchObject({ status: 409, code: "QUOTE_CHANGED" });

    const sellQuote = await requestPredictionQuote({
      identifier: marketSlug,
      outcome: "YES",
      side: "SELL",
      quantity: 1,
      userId,
    });
    await sellPredictionShares({
      identifier: marketSlug,
      outcome: "YES",
      quantity: 1,
      quoteToken: sellQuote.quoteToken,
      userId,
      idempotencyKey: `prediction-sell-${suffix}`,
    });
    await expect(
      requestPredictionQuote({
        identifier: marketSlug,
        outcome: "YES",
        side: "BUY",
        quantity: 3,
        userId,
      }),
    ).rejects.toMatchObject({ status: 422, code: "DAILY_BUY_LIMIT" });
    await expect(
      updatePredictionMarketRules({
        identifier: marketSlug,
        description: "This edit must be rejected after trading starts.",
        adminUserId: adminOneId,
      }),
    ).rejects.toMatchObject({ status: 409, code: "RULES_LOCKED" });

    const [wallet, ledger, market, position] = await Promise.all([
      prisma.wallet.findUniqueOrThrow({ where: { userId } }),
      prisma.ledgerEntry.findMany({ where: { wallet: { userId } } }),
      prisma.predictionMarket.findUniqueOrThrow({ where: { slug: marketSlug } }),
      prisma.predictionPosition.findFirstOrThrow({ where: { userId, market: { slug: marketSlug } } }),
    ]);
    expect(ledger.reduce((sum, entry) => sum + entry.delta, 0)).toBe(wallet.softBalance);
    expect(market.yesShares).toBe(1);
    expect(position.shares).toBe(1);
    expect(await prisma.predictionTrade.count({ where: { marketId: market.id } })).toBe(3);
    const trades = await prisma.predictionTrade.findMany({ where: { marketId: market.id } });
    const treasury = await prisma.predictionTreasury.findUniqueOrThrow({ where: { id: "system" } });
    const principal = trades.reduce((sum, trade) => sum + (trade.side === "BUY" ? trade.grossAmount : -trade.grossAmount), 0);
    const fees = trades.reduce((sum, trade) => sum + trade.feeAmount, 0);
    expect(treasury.balance - treasuryStart.balance).toBe(principal);
    expect(treasury.reserved - treasuryStart.reserved).toBe(fees);
    expect(market.reservedLiability).toBe(1387 + fees);
    expect(wallet.softBalance - 1000 + treasury.balance - treasuryStart.balance).toBe(-fees);
  });

  it("requires a second admin after challenge and pays the winning outcome", async () => {
    await lockPredictionMarket(marketSlug, adminOneId);
    const proposedAt = new Date();
    const proposal = await proposePredictionResolution({
      identifier: marketSlug,
      outcome: "YES",
      evidenceUrl: "https://example.com/integration-result",
      reasoning: "The deterministic integration source records a YES result.",
      adminUserId: adminOneId,
      now: proposedAt,
    });
    const challenge = await challengePredictionResolution({
      identifier: marketSlug,
      proposalId: proposal.proposalId,
      reason: "A second administrator should verify the fixture source before payout.",
      evidenceUrl: "https://example.com/integration-challenge",
      userId: challengerId,
      now: new Date(proposedAt.getTime() + 60_000),
    });
    const afterChallenge = new Date(proposedAt.getTime() + 25 * 60 * 60 * 1_000);
    await expect(
      finalizePredictionResolution({
        identifier: marketSlug,
        proposalId: proposal.proposalId,
        adminUserId: adminOneId,
        now: afterChallenge,
      }),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    await expect(finalizePredictionResolution({
      identifier: marketSlug, proposalId: proposal.proposalId, adminUserId: adminTwoId, now: afterChallenge,
    })).rejects.toMatchObject({ code: "CHALLENGES_PENDING" });
    await expect(reviewPredictionChallenge({
      identifier: marketSlug, challengeId: challenge.challengeId, accepted: false,
      evidenceUrl: "https://example.com/review", reasoning: "The original evidence is conclusive.", adminUserId: adminOneId,
    })).rejects.toMatchObject({ status: 403 });
    await reviewPredictionChallenge({
      identifier: marketSlug, challengeId: challenge.challengeId, accepted: false,
      evidenceUrl: "https://example.com/review", reasoning: "The original evidence is conclusive.", adminUserId: adminTwoId,
    });
    const result = await finalizePredictionResolution({
      identifier: marketSlug,
      proposalId: proposal.proposalId,
      adminUserId: adminTwoId,
      now: afterChallenge,
    });
    expect(result).toMatchObject({ status: "RESOLVED", winningOutcome: "YES", totalPayout: 100 });
    const position = await prisma.predictionPosition.findFirstOrThrow({
      where: { userId, market: { slug: marketSlug } },
    });
    expect(position).toMatchObject({ shares: 1, payout: 100 });
    expect(position.settledAt).toBeInstanceOf(Date);
    expect(await prisma.resolutionChallenge.findUniqueOrThrow({ where: { id: challenge.challengeId } })).toMatchObject({ accepted: false });
  });

  it("voids a second market and restores net historical loss plus all fees", async () => {
    await createPredictionMarket({
      eventId: eventSlug,
      slug: voidMarketSlug,
      question: "Will this integration fixture be voided?",
      description: "Exercises complete historical-loss and fee refunds.",
      resolutionSourceUrl: "https://example.com/void-result",
      resolutionSourceLabel: "Void source",
      edgeCaseRules: "The administrator voids this fixture after a round trip.",
      closesAt: new Date(Date.now() + 60 * 60 * 1_000),
      adminUserId: adminOneId,
    });
    await openPredictionMarket(voidMarketSlug, adminOneId);
    const before = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    const buyQuote = await requestPredictionQuote({
      identifier: voidMarketSlug,
      outcome: "NO",
      side: "BUY",
      quantity: 1,
      userId,
    });
    await buyPredictionShares({
      identifier: voidMarketSlug,
      outcome: "NO",
      quantity: 1,
      quoteToken: buyQuote.quoteToken,
      userId,
      idempotencyKey: `prediction-void-buy-${suffix}`,
    });
    const sellQuote = await requestPredictionQuote({
      identifier: voidMarketSlug,
      outcome: "NO",
      side: "SELL",
      quantity: 1,
      userId,
    });
    await sellPredictionShares({
      identifier: voidMarketSlug,
      outcome: "NO",
      quantity: 1,
      quoteToken: sellQuote.quoteToken,
      userId,
      idempotencyKey: `prediction-void-sell-${suffix}`,
    });
    const result = await voidPredictionMarket({
      identifier: voidMarketSlug,
      reason: "The integration fixture intentionally has no resolvable external outcome.",
      adminUserId: adminOneId,
    });
    expect(result).toMatchObject({ status: "VOID", totalRefund: 4, refundedUsers: 1 });
    const after = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    expect(after.softBalance).toBe(before.softBalance);
    expect(
      await prisma.ledgerEntry.count({
        where: { wallet: { userId }, referenceType: "PREDICTION_REFUND" },
      }),
    ).toBe(1);
  });

  it("preserves accepted challenges and permits a corrected proposal only after all individual reviews", async () => {
    const slug = `prediction-correction-${suffix}`;
    await createPredictionMarket({
      eventId: eventSlug, slug, question: "Will the corrected source resolve NO?",
      description: "An incorrect proposal is corrected without overwriting the original evidence.",
      resolutionSourceUrl: "https://example.com/correction", resolutionSourceLabel: "Correction fixture",
      edgeCaseRules: "Only the dated official correction determines the result.",
      closesAt: new Date(Date.now() + 60 * 60 * 1_000), adminUserId: adminOneId,
    });
    await openPredictionMarket(slug, adminOneId);
    await lockPredictionMarket(slug, adminOneId);
    const now = new Date();
    const original = await proposePredictionResolution({
      identifier: slug, outcome: "YES", evidenceUrl: "https://example.com/original",
      reasoning: "An initial reading of the source suggests YES.", adminUserId: adminOneId, now,
    });
    const first = await challengePredictionResolution({
      identifier: slug, userId: challengerId, reason: "A dated official correction explicitly states NO.",
      evidenceUrl: "https://example.com/corrected", now,
    });
    const second = await challengePredictionResolution({
      identifier: slug, userId, reason: "Another source needs an independent assessment.",
      evidenceUrl: "https://example.com/secondary", now,
    });
    await reviewPredictionChallenge({
      identifier: slug, challengeId: first.challengeId, accepted: true,
      evidenceUrl: "https://example.com/corrected", reasoning: "The official dated correction invalidates the original proposal.",
      adminUserId: adminTwoId, now,
    });
    const correction = {
      identifier: slug, outcome: "NO", evidenceUrl: "https://example.com/corrected",
      reasoning: "The corrected official source explicitly records NO.", adminUserId: adminOneId, now,
    };
    await expect(proposePredictionResolution(correction)).rejects.toMatchObject({ code: "CHALLENGES_PENDING" });
    await reviewPredictionChallenge({
      identifier: slug, challengeId: second.challengeId, accepted: false,
      evidenceUrl: "https://example.com/corrected", reasoning: "The secondary source is superseded by the dated correction.",
      adminUserId: adminTwoId, now,
    });
    const revised = await proposePredictionResolution(correction);
    expect(revised.proposalId).not.toBe(original.proposalId);
    expect(new Date(revised.challengeEndsAt).getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(await prisma.resolutionProposal.findUniqueOrThrow({ where: { id: original.proposalId } })).toMatchObject({ status: "VOIDED", evidenceUrl: "https://example.com/original" });
    expect(await prisma.resolutionChallenge.findUniqueOrThrow({ where: { id: first.challengeId } })).toMatchObject({ accepted: true });
    await expect(finalizePredictionResolution({ identifier: slug, adminUserId: adminTwoId, now })).rejects.toMatchObject({ code: "CHALLENGE_WINDOW_OPEN" });
    await voidPredictionMarket({ identifier: slug, adminUserId: adminTwoId, reason: "Clean up the corrected integration market after assertions." });
  });
});
