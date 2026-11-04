import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/seed-db";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

function existingDatabase(marketsExist = true) {
  const upsert = () => vi.fn(async ({ create }: { create: Record<string, unknown> }) => create);
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    user: { count: vi.fn().mockResolvedValue(1), upsert: vi.fn() },
    character: { count: vi.fn().mockResolvedValue(4) },
    series: { count: vi.fn().mockResolvedValue(2) },
    wallet: { upsert: vi.fn() },
    creatorProfile: { upsert: vi.fn() }, post: { upsert: vi.fn() },
    topic: { upsert: upsert() }, topicLocale: { upsert: upsert() },
    predictionEvent: { upsert: vi.fn(async ({ create }) => ({ ...create, id: `existing-${create.id}` })) },
    predictionEventLocale: { upsert: upsert() },
    predictionMarket: {
      count: vi.fn().mockResolvedValue(marketsExist ? 1 : 0),
      findFirst: vi.fn().mockResolvedValue(marketsExist ? { id: "live-market", question: "User rules", yesShares: 4 } : null),
      create: vi.fn(async ({ data }) => ({ ...data, timezone: "Asia/Hong_Kong" })),
    },
    predictionMarketLocale: { upsert: upsert() }, predictionOutcome: { upsert: upsert() },
    oracleSource: { upsert: upsert() }, predictionRuleVersion: { upsert: upsert() },
    predictionTreasury: { upsert: upsert() },
  };
  const db = { $transaction: vi.fn(async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx)) };
  return { tx, db: db as unknown as typeof prisma };
}

describe("non-destructive prediction V3 bootstrap", () => {
  it("upgrades existing databases without seeding demo users, wallets, activity, or overwriting market rules", async () => {
    const { db, tx } = existingDatabase();
    await expect(seedDatabase(db)).resolves.toEqual({ mode: "upgraded" });
    expect(tx.user.upsert).not.toHaveBeenCalled();
    expect(tx.wallet.upsert).not.toHaveBeenCalled();
    expect(tx.creatorProfile.upsert).not.toHaveBeenCalled();
    expect(tx.post.upsert).not.toHaveBeenCalled();
    expect(tx.predictionMarket.create).not.toHaveBeenCalled();
    expect(tx.predictionRuleVersion.upsert).not.toHaveBeenCalled();
    expect(tx.predictionMarketLocale.upsert).not.toHaveBeenCalled();
    expect(tx.predictionTreasury.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {} }));
    for (const [call] of tx.topic.upsert.mock.calls) expect(call).toMatchObject({ update: {} });
    for (const [call] of tx.predictionEventLocale.upsert.mock.calls) {
      expect(call).toMatchObject({ create: { eventId: expect.stringMatching(/^existing-/) }, update: {} });
    }
  });

  it("creates only fully specified draft templates with zero reserves, including on repeated upgrades", async () => {
    const { db, tx } = existingDatabase(false);
    await seedDatabase(db);
    expect(tx.predictionMarket.create).toHaveBeenCalledTimes(2);
    for (const [call] of tx.predictionMarket.create.mock.calls) {
      expect(call.data).toMatchObject({ status: "DRAFT", reservedLiability: 0, eventId: expect.stringMatching(/^existing-/) });
      expect(call.data.description).toContain("Asia/Hong_Kong");
      expect(call.data.description).toContain("Otherwise No");
    }
    tx.predictionMarket.findFirst.mockResolvedValue({ id: "live-market", question: "Owner correction", yesShares: 4 });
    tx.predictionMarket.create.mockClear();
    await seedDatabase(db);
    expect(tx.predictionMarket.create).not.toHaveBeenCalled();
  });
});
