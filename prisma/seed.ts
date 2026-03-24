import { seedSnapshot } from "../src/data/seed";

async function main() {
  console.log("Seed snapshot ready.");
  console.log(
    JSON.stringify(
      {
        characters: seedSnapshot.characters.length,
        shopItems: seedSnapshot.shopItems.length,
        profiles: seedSnapshot.profiles.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
