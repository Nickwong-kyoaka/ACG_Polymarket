import {
  AD_REWARD,
  DAILY_CHECK_IN_REWARD,
  DEFAULT_CHARACTER_PRICE_STEP,
  DEFAULT_CHARACTER_UNITS_PER_STEP,
  MAX_COMMENT_LENGTH,
  STARTER_BALANCE,
} from "@/lib/constants";
import {
  calculateBuyBatchCost,
  calculateSellBatchReturn,
  canClaimAdReward,
  canClaimDailyReward,
  getBuyQuote,
  getSellQuote,
} from "@/lib/market";
import { getHongKongDayKey } from "@/lib/time";
import { seedSnapshot } from "@/data/seed";
import { slugify } from "@/lib/utils";
import type {
  AdRewardClaim,
  AssetWorkflowStatus,
  Character,
  CharacterAsset,
  CharacterView,
  Comment,
  CurrencyType,
  InventoryItem,
  LedgerEntry,
  LedgerReferenceType,
  Notification,
  PortfolioView,
  Profile,
  Reaction,
  RightsGrant,
  SeedSnapshot,
  ShopItem,
  SourceAttribution,
  SupportPosition,
  Trade,
  Wallet,
} from "@/lib/types";

const globalForStore = globalThis as typeof globalThis & {
  __acgPolymarketStore?: SeedSnapshot;
};

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneSeed() {
  return structuredClone(seedSnapshot);
}

function dataStore() {
  if (!globalForStore.__acgPolymarketStore) {
    globalForStore.__acgPolymarketStore = cloneSeed();
  }

  return globalForStore.__acgPolymarketStore;
}

function getUserId(userId?: string) {
  return userId ?? process.env.DEMO_USER_ID ?? "viewer-001";
}

function requireUser(userId?: string) {
  const activeUserId = getUserId(userId);
  const user = dataStore().users.find((entry) => entry.id === activeUserId);

  if (!user) {
    throw new Error("Unable to resolve the active user.");
  }

  return user;
}

function requireAdmin(userId?: string) {
  const user = requireUser(userId);
  if (user.role !== "ADMIN" && process.env.DEMO_ADMIN_ENABLED !== "true") {
    throw new Error("Admin privileges are required.");
  }

  return user;
}

function findCharacter(identifier: string) {
  return dataStore().characters.find(
    (character) => character.id === identifier || character.slug === identifier,
  );
}

function requireCharacter(identifier: string) {
  const character = findCharacter(identifier);
  if (!character) {
    throw new Error("Character not found.");
  }

  return character;
}

function requireWallet(userId: string) {
  const wallet = dataStore().wallets.find((entry) => entry.userId === userId);
  if (!wallet) {
    throw new Error("Wallet not found.");
  }

  return wallet;
}

function requireProfile(userId: string) {
  const profile = dataStore().profiles.find((entry) => entry.userId === userId);
  if (!profile) {
    throw new Error("Profile not found.");
  }

  return profile;
}

function createLedgerEntry(
  wallet: Wallet,
  delta: number,
  referenceType: LedgerReferenceType,
  referenceId: string,
  idempotencyKey: string,
  currencyType: CurrencyType = "SOFT",
) {
  if (dataStore().ledgerEntries.some((entry) => entry.idempotencyKey === idempotencyKey)) {
    throw new Error("This action was already processed.");
  }

  const nextBalance = wallet.softBalance + delta;
  if (nextBalance < 0) {
    throw new Error("Balance cannot go negative.");
  }

  wallet.softBalance = nextBalance;
  const entry: LedgerEntry = {
    id: randomId("ledger"),
    walletId: wallet.id,
    currencyType,
    delta,
    balanceAfter: wallet.softBalance,
    referenceType,
    referenceId,
    idempotencyKey,
    createdAt: new Date().toISOString(),
  };

  dataStore().ledgerEntries.unshift(entry);
  return entry;
}

function createNotification(userId: string, title: string, body: string, type: Notification["type"]) {
  const notification: Notification = {
    id: randomId("notification"),
    userId,
    title,
    body,
    type,
    createdAt: new Date().toISOString(),
  };

  dataStore().notifications.unshift(notification);
  return notification;
}

function getPosition(userId: string, characterId: string) {
  return dataStore().positions.find(
    (entry) => entry.userId === userId && entry.characterId === characterId,
  );
}

function ensurePosition(userId: string, characterId: string) {
  const existing = getPosition(userId, characterId);
  if (existing) {
    return existing;
  }

  const created: SupportPosition = {
    id: randomId("position"),
    userId,
    characterId,
    units: 0,
    averageCost: 0,
    updatedAt: new Date().toISOString(),
  };

  dataStore().positions.push(created);
  return created;
}

function equipInventoryItem(inventoryItem: InventoryItem, item: ShopItem, profile: Profile) {
  dataStore().inventoryItems.forEach((entry) => {
    if (entry.userId !== inventoryItem.userId) {
      return;
    }

    const candidate = dataStore().shopItems.find((shopItem) => shopItem.id === entry.shopItemId);
    if (candidate?.kind === item.kind) {
      entry.equipped = entry.id === inventoryItem.id;
    }
  });

  inventoryItem.equipped = true;
  if (item.kind === "AVATAR_FRAME") {
    profile.equippedFrameAsset = item.unlockPayload.assetId;
  }

  if (item.kind === "PROFILE_THEME") {
    profile.equippedThemeAsset = item.unlockPayload.assetId;
  }
}

export function getCurrentViewer() {
  const user = requireUser();
  const profile = requireProfile(user.id);
  const wallet = requireWallet(user.id);
  return { user, profile, wallet };
}

export function listCharacters(filters?: {
  search?: string;
  tag?: string;
  rightsType?: string;
  featuredOnly?: boolean;
}) {
  const search = filters?.search?.toLowerCase().trim();
  const tag = filters?.tag?.toLowerCase();
  const rightsType = filters?.rightsType?.toUpperCase();

  return dataStore()
    .characters.filter((character) => {
      if (filters?.featuredOnly && !character.isFeatured) {
        return false;
      }

      if (search) {
        const haystack = `${character.name} ${character.title} ${character.summary} ${character.tags.join(" ")}`;
        if (!haystack.toLowerCase().includes(search)) {
          return false;
        }
      }

      if (tag && !character.tags.some((entry) => entry.toLowerCase() === tag)) {
        return false;
      }

      if (rightsType && character.rightsType !== rightsType) {
        return false;
      }

      return true;
    })
    .sort((left, right) => right.supporterCount - left.supporterCount);
}

export function getCharacterView(identifier: string): CharacterView {
  const character = requireCharacter(identifier);
  const series = dataStore().series.find((entry) => entry.id === character.seriesId);

  if (!series) {
    throw new Error("Series not found.");
  }

  const assets = dataStore().assets.filter((asset) => character.assetIds.includes(asset.id));
  const rightsGrants = dataStore().rightsGrants.filter((grant) =>
    character.rightsGrantIds.includes(grant.id),
  );
  const sourceAttribution = dataStore().sourceAttributions.find(
    (entry) => entry.id === character.sourceAttributionId,
  );
  const attributes = character.attributeValues
    .map((attributeValue) => {
      const definition = dataStore().attributeDefinitions.find(
        (entry) => entry.id === attributeValue.definitionId,
      );
      return definition ? { ...definition, value: attributeValue.value } : undefined;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const relatedCharacters = dataStore().characters.filter((entry) =>
    character.relatedCharacterIds.includes(entry.id),
  );
  const comments = dataStore().comments
    .filter((entry) => entry.characterId === character.id)
    .map((comment) => ({
      ...comment,
      author: dataStore().profiles.find((profile) => profile.userId === comment.userId),
    }))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    character,
    series,
    assets,
    rightsGrants,
    sourceAttribution,
    attributes,
    quote: getBuyQuote(character),
    sellQuote: getSellQuote(character),
    relatedCharacters,
    comments,
    reactions: dataStore().reactions.filter((entry) => entry.characterId === character.id),
  };
}

export function getPortfolioView(userId?: string): PortfolioView {
  const activeUserId = getUserId(userId);
  const profile = requireProfile(activeUserId);
  const wallet = requireWallet(activeUserId);

  const positions = dataStore()
    .positions.filter((entry) => entry.userId === activeUserId && entry.units > 0)
    .map((position) => {
      const character = requireCharacter(position.characterId);
      const currentQuote = getBuyQuote(character);
      return {
        ...position,
        character,
        currentQuote,
        currentValue: currentQuote * position.units,
      };
    })
    .sort((left, right) => right.currentValue - left.currentValue);

  const inventory = dataStore()
    .inventoryItems.filter((entry) => entry.userId === activeUserId)
    .map((entry) => ({
      ...entry,
      item: dataStore().shopItems.find((item) => item.id === entry.shopItemId)!,
    }));

  const watchlist = dataStore()
    .watchlistItems.filter((entry) => entry.userId === activeUserId)
    .map((entry) => requireCharacter(entry.characterId));

  const notifications = dataStore()
    .notifications.filter((entry) => entry.userId === activeUserId)
    .slice(0, 8);

  return {
    profile,
    wallet,
    positions,
    inventory,
    watchlist,
    notifications,
  };
}

export function getShopItems() {
  return dataStore().shopItems.filter((item) => item.published);
}

export function buySupport(identifier: string, quantity: number, userId?: string) {
  const user = requireUser(userId);
  const character = requireCharacter(identifier);
  const wallet = requireWallet(user.id);
  const position = ensurePosition(user.id, character.id);
  const { totalCost, unitPrice } = calculateBuyBatchCost(character, quantity);

  if (wallet.softBalance < totalCost) {
    throw new Error("Not enough SUP to complete this support purchase.");
  }

  createLedgerEntry(
    wallet,
    -totalCost,
    "BUY_SUPPORT",
    character.id,
    `buy-${user.id}-${character.id}-${Date.now()}-${quantity}`,
  );

  const nextUnits = position.units + quantity;
  position.averageCost = Math.round(
    (position.averageCost * position.units + totalCost) / Math.max(nextUnits, 1),
  );
  position.units = nextUnits;
  position.updatedAt = new Date().toISOString();
  character.circulatingUnits += quantity;
  if (position.units === quantity) {
    character.supporterCount += 1;
  }

  const trade: Trade = {
    id: randomId("trade"),
    userId: user.id,
    characterId: character.id,
    side: "BUY",
    quantity,
    totalCost,
    unitPrice,
    createdAt: new Date().toISOString(),
  };

  dataStore().trades.unshift(trade);
  createNotification(
    user.id,
    `Supported ${character.name}`,
    `You added ${quantity} support unit${quantity > 1 ? "s" : ""} at ${unitPrice} SUP.`,
    "TRADE",
  );

  return {
    trade,
    wallet,
    position,
    quote: getBuyQuote(character),
  };
}

export function sellSupport(identifier: string, quantity: number, userId?: string) {
  const user = requireUser(userId);
  const character = requireCharacter(identifier);
  const wallet = requireWallet(user.id);
  const position = ensurePosition(user.id, character.id);

  if (position.units < quantity) {
    throw new Error("You cannot sell more support units than you hold.");
  }

  const { totalReturn, unitPrice } = calculateSellBatchReturn(character, quantity);

  createLedgerEntry(
    wallet,
    totalReturn,
    "SELL_SUPPORT",
    character.id,
    `sell-${user.id}-${character.id}-${Date.now()}-${quantity}`,
  );

  position.units -= quantity;
  position.updatedAt = new Date().toISOString();
  if (position.units === 0) {
    position.averageCost = 0;
    character.supporterCount = Math.max(character.supporterCount - 1, 0);
  }
  character.circulatingUnits = Math.max(character.circulatingUnits - quantity, 0);

  const trade: Trade = {
    id: randomId("trade"),
    userId: user.id,
    characterId: character.id,
    side: "SELL",
    quantity,
    totalCost: totalReturn,
    unitPrice,
    createdAt: new Date().toISOString(),
  };

  dataStore().trades.unshift(trade);
  createNotification(
    user.id,
    `Trimmed ${character.name}`,
    `You sold ${quantity} support unit${quantity > 1 ? "s" : ""} for ${totalReturn} SUP.`,
    "TRADE",
  );

  return {
    trade,
    wallet,
    position,
    quote: getBuyQuote(character),
  };
}

export function claimDailyReward(userId?: string) {
  const user = requireUser(userId);
  const wallet = requireWallet(user.id);

  if (!canClaimDailyReward(dataStore().dailyRewardClaims, user.id)) {
    throw new Error("Today's check-in reward has already been claimed.");
  }

  const dayKey = getHongKongDayKey();
  const claim = {
    id: randomId("daily"),
    userId: user.id,
    dayKey,
    amount: DAILY_CHECK_IN_REWARD,
    claimedAt: new Date().toISOString(),
  };

  dataStore().dailyRewardClaims.unshift(claim);
  createLedgerEntry(
    wallet,
    DAILY_CHECK_IN_REWARD,
    "DAILY_REWARD",
    dayKey,
    `daily-${user.id}-${dayKey}`,
  );
  createNotification(
    user.id,
    "Daily reward claimed",
    `You received ${DAILY_CHECK_IN_REWARD} SUP.`,
    "REWARD",
  );

  return { claim, wallet };
}

export function claimAdReward(userId?: string) {
  const user = requireUser(userId);
  const wallet = requireWallet(user.id);

  if (!canClaimAdReward(dataStore().adRewardClaims, user.id)) {
    throw new Error("You have reached today's ad reward limit.");
  }

  const dayKey = getHongKongDayKey();
  const claim: AdRewardClaim = {
    id: randomId("ad"),
    userId: user.id,
    dayKey,
    amount: AD_REWARD,
    claimedAt: new Date().toISOString(),
  };

  dataStore().adRewardClaims.unshift(claim);
  createLedgerEntry(wallet, AD_REWARD, "AD_REWARD", dayKey, `ad-${user.id}-${Date.now()}`);
  createNotification(
    user.id,
    "Ad reward received",
    `You picked up ${AD_REWARD} SUP from a rewarded ad.`,
    "REWARD",
  );

  return { claim, wallet };
}

export function toggleWatchlist(characterId: string, userId?: string) {
  const user = requireUser(userId);
  requireCharacter(characterId);
  const existing = dataStore().watchlistItems.find(
    (entry) => entry.userId === user.id && entry.characterId === characterId,
  );

  if (existing) {
    dataStore().watchlistItems = dataStore().watchlistItems.filter(
      (entry) => entry.id !== existing.id,
    );
    return { watching: false };
  }

  dataStore().watchlistItems.unshift({
    id: randomId("watch"),
    userId: user.id,
    characterId,
    createdAt: new Date().toISOString(),
  });

  return { watching: true };
}

export function addComment(characterId: string, content: string, userId?: string) {
  const user = requireUser(userId);
  requireCharacter(characterId);

  if (content.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comments must stay under ${MAX_COMMENT_LENGTH} characters.`);
  }

  const comment: Comment = {
    id: randomId("comment"),
    userId: user.id,
    characterId,
    content,
    createdAt: new Date().toISOString(),
  };

  dataStore().comments.unshift(comment);
  return comment;
}

export function toggleReaction(characterId: string, kind: Reaction["kind"], userId?: string) {
  const user = requireUser(userId);
  requireCharacter(characterId);
  const existing = dataStore().reactions.find(
    (entry) =>
      entry.userId === user.id && entry.characterId === characterId && entry.kind === kind,
  );

  if (existing) {
    dataStore().reactions = dataStore().reactions.filter((entry) => entry.id !== existing.id);
    return { active: false };
  }

  const reaction: Reaction = {
    id: randomId("reaction"),
    userId: user.id,
    characterId,
    kind,
    createdAt: new Date().toISOString(),
  };

  dataStore().reactions.unshift(reaction);
  return { active: true };
}

export function createReport(input: {
  reason: string;
  detail?: string;
  characterId?: string;
  commentId?: string;
  userId?: string;
}) {
  const user = requireUser(input.userId);

  const report = {
    id: randomId("report"),
    userId: user.id,
    characterId: input.characterId,
    commentId: input.commentId,
    reason: input.reason,
    detail: input.detail,
    createdAt: new Date().toISOString(),
  };

  dataStore().reports.unshift(report);
  return report;
}

export function purchaseShopItem(itemId: string, userId?: string, equip = true) {
  const user = requireUser(userId);
  const wallet = requireWallet(user.id);
  const profile = requireProfile(user.id);
  const item = dataStore().shopItems.find((entry) => entry.id === itemId && entry.published);

  if (!item) {
    throw new Error("Shop item not found.");
  }

  const alreadyOwned = dataStore().inventoryItems.find(
    (entry) => entry.userId === user.id && entry.shopItemId === item.id,
  );

  if (alreadyOwned) {
    if (equip) {
      equipInventoryItem(alreadyOwned, item, profile);
    }

    return { item, inventoryItem: alreadyOwned, wallet };
  }

  if (item.currencyType === "SOFT") {
    createLedgerEntry(
      wallet,
      -item.price,
      "SHOP_PURCHASE",
      item.id,
      `shop-${user.id}-${item.id}-${Date.now()}`,
    );
  }

  const inventoryItem: InventoryItem = {
    id: randomId("inventory"),
    userId: user.id,
    shopItemId: item.id,
    equipped: false,
    createdAt: new Date().toISOString(),
  };

  dataStore().inventoryItems.unshift(inventoryItem);
  if (equip) {
    equipInventoryItem(inventoryItem, item, profile);
  }

  createNotification(user.id, "Cosmetic unlocked", `${item.title} is now in your locker.`, "SHOP");

  return { item, inventoryItem, wallet };
}

export function createAdminCharacter(
  input: {
    seriesId: string;
    name: string;
    title: string;
    summary: string;
    fandomPrompt: string;
    mood: string;
    rightsType: Character["rightsType"];
    metadataOnly?: boolean;
    basePrice: number;
    tags: string[];
    accentFrom: string;
    accentTo: string;
    priceStep?: number;
    unitsPerStep?: number;
  },
  userId?: string,
) {
  requireAdmin(userId);
  const character: Character = {
    id: randomId("character"),
    slug: slugify(input.name),
    seriesId: input.seriesId,
    name: input.name,
    title: input.title,
    summary: input.summary,
    fandomPrompt: input.fandomPrompt,
    mood: input.mood,
    rightsType: input.rightsType,
    metadataOnly: input.metadataOnly ?? false,
    basePrice: input.basePrice,
    priceStep: input.priceStep ?? DEFAULT_CHARACTER_PRICE_STEP,
    unitsPerStep: input.unitsPerStep ?? DEFAULT_CHARACTER_UNITS_PER_STEP,
    circulatingUnits: 0,
    supporterCount: 0,
    isFeatured: false,
    tags: input.tags,
    accentFrom: input.accentFrom,
    accentTo: input.accentTo,
    relatedCharacterIds: [],
    attributeValues: [],
    assetIds: [],
    rightsGrantIds: [],
  };

  dataStore().characters.unshift(character);
  return character;
}

export function createAdminAsset(
  input: Omit<CharacterAsset, "id" | "version" | "publishedAt"> & {
    workflowStatus: AssetWorkflowStatus;
  },
  userId?: string,
) {
  requireAdmin(userId);

  if (input.workflowStatus === "PUBLISHED" && !input.rightsGrantId) {
    throw new Error("Published assets require a linked rights grant.");
  }

  const asset: CharacterAsset = {
    ...input,
    id: randomId("asset"),
    version: 1,
    publishedAt: input.workflowStatus === "PUBLISHED" ? new Date().toISOString() : undefined,
  };

  dataStore().assets.unshift(asset);
  if (asset.characterId) {
    const character = requireCharacter(asset.characterId);
    if (!character.assetIds.includes(asset.id)) {
      character.assetIds.push(asset.id);
    }
  }

  return asset;
}

export function createAdminShopItem(
  input: Omit<ShopItem, "id" | "slug" | "published" | "unlockPayload"> & { assetId: string },
  userId?: string,
) {
  requireAdmin(userId);

  const asset = dataStore().assets.find((entry) => entry.id === input.assetId);
  if (!asset) {
    throw new Error("Linked asset not found.");
  }

  const shopItem: ShopItem = {
    id: randomId("shop"),
    collectionId: input.collectionId,
    slug: slugify(input.title),
    title: input.title,
    description: input.description,
    kind: input.kind,
    currencyType: input.currencyType,
    price: input.price,
    previewLabel: input.previewLabel,
    unlockPayload: { assetId: asset.id },
    published: true,
  };

  dataStore().shopItems.unshift(shopItem);
  return shopItem;
}

export function importBangumiCharacter(
  input: {
    seriesTitle: string;
    characterName: string;
    slug: string;
    summary: string;
    fandomPrompt: string;
    tags: string[];
    sourceUrl: string;
    sourceLabel: string;
    importedText?: string;
    licenseName?: string;
    attributionText?: string;
    originalAuthor?: string;
  },
  userId?: string,
) {
  requireAdmin(userId);

  if (input.importedText && (!input.licenseName || !input.attributionText)) {
    throw new Error("Imported Bangumi text requires license and attribution details.");
  }

  const seriesId = randomId("series");
  const series = {
    id: seriesId,
    slug: slugify(input.seriesTitle),
    title: input.seriesTitle,
    summary: "Imported metadata shell created from Bangumi-compatible source data.",
    rightsType: "LICENSED" as const,
    metadataOnly: true,
    bangumiUrl: input.sourceUrl,
  };

  dataStore().series.unshift(series);

  const character: Character = {
    id: randomId("character"),
    seriesId,
    slug: input.slug,
    name: input.characterName,
    title: `${input.characterName} archive profile`,
    summary: input.summary,
    fandomPrompt: input.fandomPrompt,
    mood: "Archive-ready",
    rightsType: "LICENSED",
    metadataOnly: true,
    basePrice: 15,
    priceStep: DEFAULT_CHARACTER_PRICE_STEP,
    unitsPerStep: DEFAULT_CHARACTER_UNITS_PER_STEP,
    circulatingUnits: 0,
    supporterCount: 0,
    isFeatured: false,
    tags: input.tags,
    accentFrom: "#64748b",
    accentTo: "#cbd5e1",
    relatedCharacterIds: [],
    attributeValues: [],
    assetIds: [],
    rightsGrantIds: [],
  };

  dataStore().characters.unshift(character);

  const grant: RightsGrant = {
    id: randomId("rights"),
    seriesId,
    characterId: character.id,
    licensor: "Bangumi metadata import",
    contractReference: "CC-BY-SA-METADATA",
    territories: ["Worldwide"],
    salesChannels: ["Metadata display"],
    allowedUseTypes: ["Metadata", "Attribution"],
    attributionText:
      input.attributionText ?? "Metadata adapted from Bangumi with attribution preserved.",
    takedownContact: "metadata@example.com",
    commercialUse: false,
  };

  const attribution: SourceAttribution = {
    id: randomId("source"),
    characterId: character.id,
    sourceKind: "BANGUMI",
    sourceLabel: input.sourceLabel,
    sourceUrl: input.sourceUrl,
    licenseName: input.licenseName ?? "CC BY-SA",
    attributionText:
      input.attributionText ?? "Metadata adapted from Bangumi with attribution preserved.",
    importedText: input.importedText,
    originalAuthor: input.originalAuthor ?? "Bangumi contributors",
    importedAt: new Date().toISOString(),
  };

  dataStore().rightsGrants.unshift(grant);
  dataStore().sourceAttributions.unshift(attribution);
  character.rightsGrantIds.push(grant.id);
  character.sourceAttributionId = attribution.id;

  return { series, character, grant, attribution };
}

export function getAdminSnapshot() {
  return {
    characters: dataStore().characters,
    assets: dataStore().assets,
    rightsGrants: dataStore().rightsGrants,
    reports: dataStore().reports,
    shopItems: dataStore().shopItems,
    sourceAttributions: dataStore().sourceAttributions,
  };
}

export function getPublicSnapshot() {
  return {
    viewer: getCurrentViewer(),
    characters: listCharacters(),
    shopItems: getShopItems(),
  };
}

export function resetDemoStore() {
  globalForStore.__acgPolymarketStore = cloneSeed();
}

export function getCommentCount(characterId: string) {
  return dataStore().comments.filter((entry) => entry.characterId === characterId).length;
}

export function getWatchlistIds(userId?: string) {
  return dataStore()
    .watchlistItems.filter((entry) => entry.userId === getUserId(userId))
    .map((entry) => entry.characterId);
}

export function getReactionSummary(characterId: string) {
  return dataStore()
    .reactions.filter((entry) => entry.characterId === characterId)
    .reduce<Record<string, number>>((summary, reaction) => {
      summary[reaction.kind] = (summary[reaction.kind] ?? 0) + 1;
      return summary;
    }, {});
}

export function getRecentTrades(limit = 8) {
  return dataStore().trades.slice(0, limit).map((trade) => ({
    ...trade,
    character: requireCharacter(trade.characterId),
  }));
}

export function getUserByHandle(handle: string) {
  const profile = dataStore().profiles.find((entry) => entry.handle === handle);
  if (!profile) {
    throw new Error("Profile not found.");
  }

  return {
    user: requireUser(profile.userId),
    profile,
    wallet: requireWallet(profile.userId),
    positions: getPortfolioView(profile.userId).positions,
  };
}

export function bootstrapStarterBalance(userId?: string) {
  const user = requireUser(userId);
  const wallet = dataStore().wallets.find((entry) => entry.userId === user.id);
  if (wallet) {
    return wallet;
  }

  const createdWallet: Wallet = {
    id: randomId("wallet"),
    userId: user.id,
    softBalance: 0,
    premiumBalance: 0,
  };

  dataStore().wallets.unshift(createdWallet);
  createLedgerEntry(
    createdWallet,
    STARTER_BALANCE,
    "STARTER_GRANT",
    "starter-balance",
    `starter-${user.id}`,
  );
  return createdWallet;
}

export function getProfiles() {
  return dataStore().profiles;
}

export function getUsers() {
  return dataStore().users;
}
