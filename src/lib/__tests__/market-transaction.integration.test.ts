import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getOptionalSessionUserId: vi.fn(),
}));

import { createMarketAlert } from "@/lib/market-alerts";
import { requestMarketQuote } from "@/lib/market-quote";
import { prisma } from "@/lib/prisma";
import { buySupport, sellSupport } from "@/lib/store";

const runDatabaseTests = Boolean(process.env.DATABASE_URL);

describe.skipIf(!runDatabaseTests)("market transaction integration", () => {
  const suffix = randomUUID().slice(0, 8);
  const userId = `market-test-user-${suffix}`;
  const seriesId = `market-test-series-${suffix}`;
  const characterId = `market-test-character-${suffix}`;
  const slug = `market-test-${suffix}`;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { id: userId, name: "Market Test" } });
    const wallet = await prisma.wallet.create({
      data: { userId: user.id, softBalance: 1_000, premiumBalance: 0 },
    });
    await prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        currencyType: "SOFT",
        delta: 1_000,
        balanceAfter: 1_000,
        referenceType: "STARTER_GRANT",
        referenceId: user.id,
        idempotencyKey: `market-test-starter-${suffix}`,
      },
    });
    await prisma.series.create({
      data: {
        id: seriesId,
        slug: `market-test-series-${suffix}`,
        title: "Market Test Series",
        summary: "Isolated market integration fixture.",
        rightsType: "ORIGINAL",
      },
    });
    await prisma.character.create({
      data: {
        id: characterId,
        seriesId,
        slug,
        name: "Market Test Character",
        title: "Positive support fixture",
        summary: "A transaction-only test character.",
        fandomPrompt: "Support this deterministic fixture.",
        mood: "steady",
        rightsType: "ORIGINAL",
        publishStatus: "PUBLISHED",
        basePrice: 10,
        priceStep: 2,
        unitsPerStep: 10,
      },
    });
    await prisma.supportCampaign.create({
      data: {
        characterId,
        slug: `market-test-campaign-${suffix}`,
        status: "ACTIVE",
        title: "Shared test goal",
        description: "Advances only from positive support buys.",
        goalUnits: 10,
        startsAt: new Date(Date.now() - 60_000),
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.series.deleteMany({ where: { id: seriesId } });
  });

  it("executes, replays, rejects stale quotes, advances campaigns, and reconciles the ledger", async () => {
    const firstQuote = await requestMarketQuote({
      identifier: characterId,
      side: "BUY",
      quantity: 2,
      userId,
    });
    const firstKey = `market-test-buy-${suffix}`;
    const first = await buySupport(characterId, 2, firstQuote.quoteToken, userId, firstKey);
    const replay = await buySupport(characterId, 2, firstQuote.quoteToken, userId, firstKey);
    expect(replay.trade.id).toBe(first.trade.id);
    expect(first.trade).toMatchObject({
      side: "BUY",
      quantity: 2,
      total: 20,
      supplyBefore: 0,
      supplyAfter: 2,
      marketVersion: 1,
    });
    expect(await prisma.trade.count({ where: { characterId } })).toBe(1);

    await createMarketAlert({ userId, characterId, kind: "SUPPORT_ACTIVITY" });
    const freshQuote = await requestMarketQuote({
      identifier: characterId,
      side: "BUY",
      quantity: 1,
      userId,
    });
    const staleQuote = await requestMarketQuote({
      identifier: characterId,
      side: "BUY",
      quantity: 1,
      userId,
    });
    await buySupport(
      characterId,
      1,
      freshQuote.quoteToken,
      userId,
      `market-test-fresh-${suffix}`,
    );
    await expect(
      buySupport(
        characterId,
        1,
        staleQuote.quoteToken,
        userId,
        `market-test-stale-${suffix}`,
      ),
    ).rejects.toMatchObject({ status: 409, code: "QUOTE_CHANGED" });

    const sellQuote = await requestMarketQuote({
      identifier: characterId,
      side: "SELL",
      quantity: 1,
      userId,
    });
    await sellSupport(
      characterId,
      1,
      sellQuote.quoteToken,
      userId,
      `market-test-sell-${suffix}`,
    );

    const [wallet, position, character, campaign, alert, ledger] = await Promise.all([
      prisma.wallet.findUniqueOrThrow({ where: { userId } }),
      prisma.supportPosition.findUniqueOrThrow({
        where: { userId_characterId: { userId, characterId } },
      }),
      prisma.character.findUniqueOrThrow({ where: { id: characterId } }),
      prisma.supportCampaign.findFirstOrThrow({ where: { characterId } }),
      prisma.marketAlert.findFirstOrThrow({ where: { userId, characterId } }),
      prisma.ledgerEntry.findMany({ where: { wallet: { userId } } }),
    ]);
    expect(position.units).toBe(2);
    expect(character).toMatchObject({ circulatingUnits: 2, supporterCount: 1, marketVersion: 3 });
    expect(campaign.currentUnits).toBe(3);
    expect(alert).toMatchObject({ active: false });
    expect(alert.lastTriggeredAt).toBeInstanceOf(Date);
    expect(ledger.reduce((sum, entry) => sum + entry.delta, 0)).toBe(wallet.softBalance);
    expect(await prisma.trade.count({ where: { characterId } })).toBe(3);
  });
});
