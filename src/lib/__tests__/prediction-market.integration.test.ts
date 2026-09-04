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
  sellPredictionShares,
  updatePredictionMarketRules,
  voidPredictionMarket,
} from "@/lib/prediction-market";

const runDatabaseTests = Boolean(process.env.DATABASE_URL);

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
    await challengePredictionResolution({
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
});
