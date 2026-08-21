import { catalogCharactersV2, catalogSeriesV2 } from "@/data/catalog-v2";
import { calculateBuyBatchCost } from "@/lib/market";
import type { Character, CharacterAsset, LedgerEntry, SeedSnapshot, Trade } from "@/lib/types";

const seedNow = new Date("2026-08-13T08:00:00.000Z");
const seedNowIso = seedNow.toISOString();
const communityUserId = "community-seed-001";
const communityWalletId = "wallet-community-seed-001";

const accentPairs = [
  ["#ff4e72", "#ffb347"], ["#4236b7", "#3ed6e0"], ["#e83c62", "#7d3cff"], ["#243a73", "#ff7d9a"],
  ["#0f766e", "#ffcc66"], ["#8b2f5b", "#f59e0b"], ["#334155", "#38bdf8"], ["#7c3aed", "#fb7185"],
] as const;

function seriesId(slug: string) {
  if (slug === "starlit-cadence") return "series-starlit";
  if (slug === "date-a-live") return "series-date-a-live";
  return `series-${slug}`;
}

function characterId(slug: string) {
  const preserved: Record<string, string> = { "akari-hoshino": "char-akari", "ren-tsukishiro": "char-ren", "mira-kagetsu": "char-mira", "yatogami-tohka": "char-tohka", "tokisaki-kurumi": "char-kurumi" };
  return preserved[slug] ?? `char-${slug}`;
}

function visualAsset(entry: (typeof catalogCharactersV2)[number], index: number): CharacterAsset {
  const originalPath: Record<string, string> = { "akari-hoshino": "assets/characters/akari-hoshino-hero.png", "ren-tsukishiro": "assets/characters/ren-tsukishiro-hero.png", "mira-kagetsu": "assets/characters/mira-kagetsu-hero.png" };
  const isOriginal = Boolean(originalPath[entry.slug]);
  return {
    id: `asset-${entry.slug}-primary`, characterId: characterId(entry.slug), kind: "HERO", label: `${entry.name.en} primary signal visual`,
    storageKey: originalPath[entry.slug] ?? `signals/catalog-v2/${entry.slug}`, altText: isOriginal ? `AI-generated original key visual of ${entry.name.en}.` : `Abstract support signal visual for ${entry.name.en}; no third-party character image is bundled.`,
    workflowStatus: "PUBLISHED", publishedAt: seedNowIso, version: 1, rightsGrantId: isOriginal ? "rights-original" : undefined,
    sourceKind: isOriginal ? "AI_GENERATED" : "OFFICIAL_REFERENCE", sourceUrl: entry.authoritativeSource.url ?? undefined, sourceLabel: entry.authoritativeSource.label,
    attributionText: isOriginal ? "Existing repository-local AI-generated original character visual; historical generation provenance was not preserved." : "Metadata and character identity reference only. No official image bytes are bundled.",
    takedownContact: "rights@acg-exchange.example", licenseName: isOriginal ? "Platform original, AI provenance incomplete" : "Reference only; no reuse grant asserted",
    permissionStatus: "UNVERIFIED", contentRating: "SFW", retrievedAt: entry.authoritativeSource.retrievedAt, primaryPriority: 100,
    metadata: { signalFallback: !isOriginal, permissionState: "UNVERIFIED", adEligible: false, catalogIndex: index + 1 },
  };
}

function originalAlternateAssets(): CharacterAsset[] {
  return [{
    id: "asset-akari-night-support",
    characterId: characterId("akari-hoshino"),
    kind: "HERO",
    label: "Akari Hoshino midnight support outfit",
    storageKey: "assets/characters/akari-hoshino-night-support.png",
    publicUrl: "/assets/characters/akari-hoshino-night-support.png",
    altText: "AI-generated full-body illustration of Akari Hoshino in a cream star cardigan, coral skirt, navy tights, and ankle boots on a lantern-lit rooftop.",
    workflowStatus: "PUBLISHED",
    publishedAt: "2026-08-21T05:45:00.000Z",
    version: 1,
    rightsGrantId: "rights-original",
    sourceKind: "AI_GENERATED",
    sourceLabel: "ACG Exchange AI original · provenance recorded",
    attributionText: "Generated for the ACG Polymarket original character catalog using the existing Akari Hoshino key visual as an identity reference.",
    takedownContact: "wongnick.kyoaka@gmail.com",
    licenseName: "Platform original AI-assisted artwork",
    mimeType: "image/png",
    byteSize: 2_430_500,
    aiPrompt: "Preserve Akari Hoshino's orange-coral hair, amber eyes, turquoise accent strands, and star ornaments; create a full-body cozy midnight rooftop support outfit with a cream cardigan, coral skirt, navy tights, ankle boots, and signal radio; SFW; no text or branding.",
    aiModel: "OpenAI built-in image generation (model identifier not exposed)",
    permissionStatus: "VERIFIED",
    contentRating: "SFW",
    creatorName: "ACG Polymarket with OpenAI image generation",
    permissionEvidence: "Generated inside the project task at the site owner's request on 2026-08-21.",
    commercialUseAllowed: true,
    adaptationAllowed: true,
    retrievedAt: "2026-08-21T05:45:00.000Z",
    checksum: "99dbb650d64d9b6d18f0da9e34e268b3844cd5afaafd7b5a322ba7e24bf69f3f",
    reviewedAt: "2026-08-21T05:45:00.000Z",
    reviewNotes: "Identity, outfit, hands, composition, and SFW presentation visually reviewed before publication.",
    riskAcknowledgedAt: "2026-08-21T05:45:00.000Z",
    primaryPriority: 90,
    metadata: {
      generatedAt: "2026-08-21T05:45:00.000Z",
      referenceAsset: "assets/characters/akari-hoshino-hero.png",
      referenceProvenance: "Existing platform-original Akari key visual",
      altTextZhHant: "AI 生成的星野燈里全身圖；她在燈籠照亮的屋頂穿著奶油色星星針織外套、珊瑚色短裙、深藍色褲襪與短靴。",
      adEligible: true,
    },
  }];
}

export function buildSeedSnapshotV2(legacy: SeedSnapshot): SeedSnapshot {
  const bySeries = new Map<string, string[]>();
  for (const entry of catalogCharactersV2) bySeries.set(entry.seriesSlug, [...(bySeries.get(entry.seriesSlug) ?? []), characterId(entry.slug)]);
  const characters: Character[] = catalogCharactersV2.map((entry, index) => {
    const pair = accentPairs[index % accentPairs.length];
    const siblings = bySeries.get(entry.seriesSlug) ?? [];
    const ownId = characterId(entry.slug);
    return {
      id: ownId, seriesId: seriesId(entry.seriesSlug), slug: entry.slug, name: entry.name.en, title: entry.headline.en, summary: entry.summary.en, fandomPrompt: entry.fandomPrompt.en,
      mood: entry.comfortStyle.en, rightsType: entry.seriesSlug === "starlit-cadence" ? "ORIGINAL" : "LICENSED", metadataOnly: entry.seriesSlug !== "starlit-cadence", publishStatus: "PUBLISHED",
      basePrice: entry.market.basePrice, priceStep: entry.market.priceStep, unitsPerStep: entry.market.unitsPerStep, circulatingUnits: 30, supporterCount: 1, marketVersion: 30,
      isFeatured: ["akari-hoshino", "yatogami-tohka", "tokisaki-kurumi", "frieren", "hitori-gotoh", "ruby-hoshino"].includes(entry.slug), tags: entry.tags.en,
      accentFrom: pair[0], accentTo: pair[1], relatedCharacterIds: siblings.filter((id) => id !== ownId).slice(0, 4), releaseSeason: entry.releaseSeason,
      sourceTitle: catalogSeriesV2.find((series) => series.slug === entry.seriesSlug)?.title.en, favoritePhrase: entry.fandomPrompt.en, externalScores: [],
      attributeValues: [
        { definitionId: "attr-archetype", value: entry.tags.en[0] ?? "Support signal" }, { definitionId: "attr-affinity", value: entry.fandomPrompt.en },
        { definitionId: "attr-role", value: entry.headline.en }, { definitionId: "attr-vibe", value: String(78 + (index * 7) % 21) },
        { definitionId: "attr-source", value: entry.authoritativeSource.label }, { definitionId: "attr-sweetness", value: String(76 + (index * 11) % 23) },
        { definitionId: "attr-comfort-style", value: entry.comfortStyle.en }, { definitionId: "attr-voice-tone", value: "Voice metadata pending licensed or original upload" },
        { definitionId: "attr-asmr-tags", value: entry.tags.en.join(", ") }, { definitionId: "attr-external-score", value: "No live score snapshot; source page retained for review" },
      ], assetIds: [`asset-${entry.slug}-primary`], rightsGrantIds: entry.seriesSlug === "starlit-cadence" ? ["rights-original"] : [], sourceAttributionId: `source-${entry.slug}`,
    };
  });

  const trades: Trade[] = [];
  const ledgerEntries: LedgerEntry[] = [];
  const positions: SeedSnapshot["positions"] = [];
  const initialCommunityBalance = 1_000_000;
  let communityBalance = initialCommunityBalance;
  ledgerEntries.push({ id: "ledger-community-funding", walletId: communityWalletId, currencyType: "SOFT", delta: initialCommunityBalance, balanceAfter: initialCommunityBalance, referenceType: "MISSION_REWARD", referenceId: "beta-market-liquidity", idempotencyKey: "beta-market-liquidity-v2", createdAt: new Date(seedNow.getTime() - 31 * 86_400_000).toISOString() });

  for (const character of characters) {
    let supply = 0;
    let total = 0;
    for (let day = 30; day >= 1; day -= 1) {
      const market = { ...character, circulatingUnits: supply };
      const execution = calculateBuyBatchCost(market, 1);
      const tradeId = `trade-v2-${character.slug}-${String(31 - day).padStart(2, "0")}`;
      const createdAt = new Date(seedNow.getTime() - day * 86_400_000 + (character.slug.length % 18) * 3_600_000).toISOString();
      total += execution.totalCost;
      trades.push({ id: tradeId, userId: communityUserId, characterId: character.id, side: "BUY", quantity: 1, totalCost: execution.totalCost, unitPrice: execution.averageUnitPrice, quoteBefore: execution.quoteBefore, quoteAfter: execution.quoteAfter, supplyBefore: execution.supplyBefore, supplyAfter: execution.supplyAfter, firstUnitPrice: execution.firstUnitPrice, lastUnitPrice: execution.lastUnitPrice, averageUnitPrice: execution.averageUnitPrice, marketVersion: 31 - day, idempotencyKey: `seed-${tradeId}`, createdAt });
      supply = execution.supplyAfter;
    }
    positions.push({ id: `position-seed-${character.slug}`, userId: communityUserId, characterId: character.id, units: supply, averageCost: Math.round(total / supply), updatedAt: seedNowIso });
  }
  for (const trade of [...trades].sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
    communityBalance -= trade.totalCost;
    ledgerEntries.push({ id: `ledger-${trade.id}`, walletId: communityWalletId, currencyType: "SOFT", delta: -trade.totalCost, balanceAfter: communityBalance, referenceType: "BUY_SUPPORT", referenceId: trade.id, idempotencyKey: `ledger-seed-${trade.id}`, createdAt: trade.createdAt });
  }

  const viewerLedger = legacy.ledgerEntries.find((entry) => entry.referenceType === "STARTER_GRANT")!;
  return {
    ...legacy,
    users: [legacy.users[0], { id: communityUserId, email: "community-seed@demo.local", name: "Community Signal", role: "USER" }],
    profiles: [legacy.profiles[0], { id: "profile-community-seed", userId: communityUserId, handle: "community-signal", displayName: "Community Signal", bio: "Reconciled beta market history account.", holdingsVisibility: false, favoriteTags: [], pinnedCharacterIds: [], }],
    wallets: [{ ...legacy.wallets[0], softBalance: 300 }, { id: communityWalletId, userId: communityUserId, softBalance: communityBalance, premiumBalance: 0 }],
    ledgerEntries: [{ ...viewerLedger, balanceAfter: 300, delta: 300 }, ...ledgerEntries],
    series: catalogSeriesV2.map((entry) => ({ id: seriesId(entry.slug), slug: entry.slug, title: entry.title.en, summary: `Character support catalog for ${entry.title.en}.`, rightsType: entry.rightsType, metadataOnly: entry.rightsType !== "ORIGINAL" })),
    rightsGrants: legacy.rightsGrants.filter((grant) => grant.id === "rights-original"),
    sourceAttributions: catalogCharactersV2.map((entry) => ({ id: `source-${entry.slug}`, characterId: characterId(entry.slug), sourceKind: "MANUAL", sourceLabel: entry.authoritativeSource.label, sourceUrl: entry.authoritativeSource.url ?? "https://github.com/Nickwong-kyoaka/ACG_Polymarket", licenseName: entry.seriesSlug === "starlit-cadence" ? "Platform original" : "Metadata reference only", attributionText: entry.seriesSlug === "starlit-cadence" ? "ACG Exchange original character catalog." : "Character identity and series metadata reference; no media reuse grant asserted.", importedAt: entry.authoritativeSource.retrievedAt })),
    assets: [...catalogCharactersV2.map(visualAsset), ...originalAlternateAssets(), ...legacy.assets.filter((asset) => !asset.characterId && ["asset-frame-sakura", "asset-theme-sunrise", "asset-wallpaper-comfort-archive"].includes(asset.id)).map((asset) => {
      const paths: Record<string, string> = { "asset-frame-sakura": "assets/cosmetics/sakura-ring-frame.svg", "asset-theme-sunrise": "assets/cosmetics/sunrise-support-theme.svg", "asset-wallpaper-comfort-archive": "assets/cosmetics/comfort-archive-wallpaper.svg" };
      return { ...asset, storageKey: paths[asset.id], publicUrl: `/${paths[asset.id]}`, sourceKind: "PLATFORM_ORIGINAL" as const, permissionStatus: "VERIFIED" as const, contentRating: "SFW" as const, licenseName: "ACG Exchange original vector", attributionText: "Original vector cosmetic created for ACG Exchange+ V2.", primaryPriority: 100 };
    })],
    characters, positions, trades,
    dailyRewardClaims: [], adRewardClaims: [], watchlistItems: [{ id: "watch-v2-akari", userId: legacy.users[0].id, characterId: characterId("akari-hoshino"), createdAt: seedNowIso }],
    comments: [], reactions: [], reports: [],
    notifications: [{ id: "notification-v2", userId: legacy.users[0].id, title: "Support Exchange+ V2", body: "The reconciled 24-character beta catalog is ready.", type: "SYSTEM", createdAt: seedNowIso }],
    shopItems: legacy.shopItems.map((item) => { const previews: Record<string, string> = { "shop-frame-sakura": "/assets/cosmetics/sakura-ring-frame.svg", "shop-theme-sunrise": "/assets/cosmetics/sunrise-support-theme.svg", "shop-wallpaper-comfort-archive": "/assets/cosmetics/comfort-archive-wallpaper.svg" }; return { ...item, unlockPayload: { ...item.unlockPayload, previewUrl: previews[item.id] } }; }),
    inventoryItems: legacy.inventoryItems,
    comfortContents: legacy.comfortContents.map((content) => ({ ...content, ...(content.characterId === "char-shiori" ? { characterId: "char-akari" } : {}), ...(content.kind === "COMIC" ? { mediaUrl: "/assets/comfort/comfort-four-panel-en.svg" } : {}), ...(content.kind === "WALLPAPER" ? { mediaUrl: "/assets/cosmetics/comfort-archive-wallpaper.svg" } : {}) })),
  };
}
