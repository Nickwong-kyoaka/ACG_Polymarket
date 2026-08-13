import { seedSnapshot } from "../src/data/seed";
import { prisma } from "../src/lib/prisma";
import { seedDatabase } from "../src/lib/seed-db";

const confirmation = process.argv.find((entry) => entry.startsWith("--confirm="))?.slice("--confirm=".length);

async function main() {
  if (confirmation !== "RESET_ACG_BETA") throw new Error("Refusing beta reset. Pass --confirm=RESET_ACG_BETA.");
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_BETA_RESET !== "true") throw new Error("Production beta reset requires ALLOW_BETA_RESET=true for this invocation.");
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
  console.log(`Resetting ACG beta data on ${databaseUrl.hostname}/${databaseUrl.pathname.replace(/^\//, "")}...`);
  const tableRows = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const safeTables = tableRows.map((row) => row.tablename).filter((name) => /^[A-Za-z][A-Za-z0-9_]*$/.test(name));
  if (safeTables.length) {
    const quoted = safeTables.map((name) => `"${name}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
  }
  await seedDatabase(prisma, seedSnapshot);
  const [characters, assets, trades, campaigns] = await Promise.all([
    prisma.character.count({ where: { publishStatus: "PUBLISHED" } }),
    prisma.characterAsset.count({ where: { characterId: { not: null }, workflowStatus: "PUBLISHED" } }),
    prisma.trade.count(),
    prisma.supportCampaign.count({ where: { status: "ACTIVE" } }),
  ]);
  if (characters !== 24 || assets < 24) throw new Error(`Beta reset invariant failed: ${characters} characters and ${assets} character visuals.`);
  console.log(JSON.stringify({ characters, primaryVisualRecords: assets, trades, campaigns }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
