import { seedSnapshot } from "../src/data/seed";
import { prisma } from "../src/lib/prisma";
import { seedDatabase } from "../src/lib/seed-db";

async function main() {
  const result = await seedDatabase(prisma, seedSnapshot);
  console.log(result.mode === "initialized"
    ? `Initialized a new database with ${seedSnapshot.characters.length} characters.`
    : "Applied additive V3 reference data; existing accounts, content, rules, and balances preserved.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
