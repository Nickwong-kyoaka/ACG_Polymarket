import { syncApprovedMedia } from "../../src/lib/approved-media";
import { prisma } from "../../src/lib/prisma";

async function main() {
  const result = await syncApprovedMedia(prisma);
  console.log("Approved media sync complete.");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
