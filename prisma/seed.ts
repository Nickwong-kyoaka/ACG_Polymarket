import { seedSnapshot } from "../src/data/seed";
import { seedDatabase } from "../src/lib/seed-db";
import { prisma } from "../src/lib/prisma";

async function main() {
  await seedDatabase(prisma, seedSnapshot);
  console.log("Seed database ready.");
  console.log(
    JSON.stringify(
      {
        characters: seedSnapshot.characters.length,
        shopItems: seedSnapshot.shopItems.length,
        profiles: seedSnapshot.profiles.length,
        comfortModes: seedSnapshot.comfortModes.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
