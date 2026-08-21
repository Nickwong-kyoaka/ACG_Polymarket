import { seedSnapshot } from "../src/data/seed";
import { syncApprovedMedia } from "../src/lib/approved-media";
import { prisma } from "../src/lib/prisma";
import { seedDatabase } from "../src/lib/seed-db";

async function main() {
  const characterCount = await prisma.character.count();

  if (characterCount === 0) {
    await seedDatabase(prisma, seedSnapshot);
    console.log(`Initialized a new database with ${seedSnapshot.characters.length} characters.`);
    return;
  }

  const media = await syncApprovedMedia(prisma);
  console.log(`Database already initialized with ${characterCount} characters; seed skipped.`);
  console.log(JSON.stringify({ media }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
