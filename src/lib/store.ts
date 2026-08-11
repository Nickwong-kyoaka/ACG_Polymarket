import { Prisma } from "@prisma/client";
import {
  AD_REWARD,
  AD_REWARD_DAILY_LIMIT,
  DAILY_CHECK_IN_REWARD,
  DEFAULT_CHARACTER_PRICE_STEP,
  DEFAULT_CHARACTER_UNITS_PER_STEP,
  MAX_COMMENT_LENGTH,
  STARTER_BALANCE,
} from "@/lib/constants";
import { bangumiImportSamples } from "@/data/bangumi-samples";
import { seedDatabase } from "@/lib/seed-db";
import { prisma } from "@/lib/prisma";
import {
  calculateBuyBatchCost,
  calculateSellBatchReturn,
  getBuyQuote,
  getSellQuote,
} from "@/lib/market";
import { getHongKongDayKey } from "@/lib/time";
import { slugify } from "@/lib/utils";
import { matchComfortMode } from "@/lib/comfort";
import { validateAssetSource, validateBangumiAttribution } from "@/lib/content-policy";
import type {
  AssetSourceKind,
  AssetWorkflowStatus,
  AttributeDefinition,
  Character,
  CharacterAsset,
  CharacterView,
  ComfortContent,
  ComfortMode,
  ComfortModeView,
  CurrencyType,
  InventoryItem,
  LedgerReferenceType,
  PortfolioView,
  Profile,
  Reaction,
  RightsGrant,
  ShopItem,
  SourceAttribution,
  SupportPosition,
  User,
  Wallet,
} from "@/lib/types";

const globalForStore = globalThis as typeof globalThis & {
  __acgPolymarketSeedPromise?: Promise<void>;
};

type Db = typeof prisma;
type Tx = Prisma.TransactionClient;

const balanceTransactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
};

const characterInclude = {
  series: true,
  tags: true,
  attributes: { include: { definition: true } },
  assets: true,
  rightsGrants: true,
  sourceAttribution: true,
} satisfies Prisma.CharacterInclude;

function toIso(value?: Date | string | null) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function toJsonRecord(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, string | number | boolean>;
}

type LooseRecord = Record<string, unknown>;
type AttributeWithDefinition = {
  value: string;
  definition: {
    id: string;
    key: string;
    label: string;
    valueType: AttributeDefinition["valueType"];
    filterable: boolean;
    sortable: boolean;
    displayable: boolean;
    sensitive: boolean;
    spoiler: boolean;
    displayOrder: number;
  };
};

function isRecord(value: unknown): value is LooseRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function recordIdList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (isRecord(entry) ? asString(entry.id) : ""))
    .filter(Boolean);
}

function tagLabels(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }

      return isRecord(entry) ? asString(entry.label) : "";
    })
    .filter(Boolean);
}

function toCharacter(record: LooseRecord): Character {
  const attributes = Array.isArray(record.attributes)
    ? record.attributes
        .map((attribute) =>
          isRecord(attribute)
            ? {
                definitionId: asString(attribute.definitionId),
                value: asString(attribute.value),
              }
            : undefined,
        )
        .filter((entry): entry is { definitionId: string; value: string } => Boolean(entry))
    : [];

  return {
    id: asString(record.id),
    seriesId: asString(record.seriesId),
    slug: asString(record.slug),
    name: asString(record.name),
    title: asString(record.title),
    summary: asString(record.summary),
    fandomPrompt: asString(record.fandomPrompt),
    mood: asString(record.mood),
    rightsType: record.rightsType as Character["rightsType"],
    metadataOnly: asBoolean(record.metadataOnly),
    basePrice: asNumber(record.basePrice),
    priceStep: asNumber(record.priceStep),
    unitsPerStep: asNumber(record.unitsPerStep),
    circulatingUnits: asNumber(record.circulatingUnits),
    supporterCount: asNumber(record.supporterCount),
    isFeatured: asBoolean(record.isFeatured),
    tags: tagLabels(record.tags),
    accentFrom: asString(record.accentFrom, "#64748b"),
    accentTo: asString(record.accentTo, "#cbd5e1"),
    relatedCharacterIds: asStringArray(record.relatedCharacterIds),
    releaseSeason: asString(record.releaseSeason) || undefined,
    sourceTitle: asString(record.sourceTitle) || undefined,
    favoritePhrase: asString(record.favoritePhrase) || undefined,
    externalScores: Array.isArray(record.externalScores)
      ? (record.externalScores as Character["externalScores"])
      : undefined,
    attributeValues: Array.isArray(record.attributeValues)
      ? (record.attributeValues as Character["attributeValues"])
      : attributes,
    assetIds: asStringArray(record.assetIds).length
      ? asStringArray(record.assetIds)
      : recordIdList(record.assets),
    rightsGrantIds: asStringArray(record.rightsGrantIds).length
      ? asStringArray(record.rightsGrantIds)
      : recordIdList(record.rightsGrants),
    sourceAttributionId:
      asString(record.sourceAttributionId) ||
      (isRecord(record.sourceAttribution) ? asString(record.sourceAttribution.id) : undefined),
  };
}

function toSeries(record: LooseRecord) {
  return {
    id: asString(record.id),
    slug: asString(record.slug),
    title: asString(record.title),
    summary: asString(record.summary),
    rightsType: record.rightsType as Character["rightsType"],
    metadataOnly: asBoolean(record.metadataOnly),
    bangumiUrl: asString(record.bangumiUrl) || undefined,
  };
}

function toAsset(record: LooseRecord): CharacterAsset {
  return {
    id: asString(record.id),
    characterId: asString(record.characterId) || undefined,
    kind: record.kind as CharacterAsset["kind"],
    label: asString(record.label),
    storageKey: asString(record.storageKey),
    altText: asString(record.altText),
    workflowStatus: record.workflowStatus as CharacterAsset["workflowStatus"],
    publishedAt: toIso(record.publishedAt as Date | string | null | undefined),
    version: asNumber(record.version, 1),
    rightsGrantId: asString(record.rightsGrantId) || undefined,
    metadata: toJsonRecord(record.metadata as Prisma.JsonValue | null | undefined),
    sourceKind: record.sourceKind as CharacterAsset["sourceKind"] | undefined,
    sourceUrl: asString(record.sourceUrl) || undefined,
    attributionText: asString(record.attributionText) || undefined,
    takedownContact: asString(record.takedownContact) || undefined,
  };
}

function toRightsGrant(record: LooseRecord): RightsGrant {
  return {
    id: asString(record.id),
    seriesId: asString(record.seriesId) || undefined,
    characterId: asString(record.characterId) || undefined,
    licensor: asString(record.licensor),
    contractReference: asString(record.contractReference),
    territories: asStringArray(record.territories),
    salesChannels: asStringArray(record.salesChannels),
    allowedUseTypes: asStringArray(record.allowedUseTypes),
    attributionText: asString(record.attributionText),
    takedownContact: asString(record.takedownContact),
    embargoAt: toIso(record.embargoAt as Date | string | null | undefined),
    expiresAt: toIso(record.expiresAt as Date | string | null | undefined),
    commercialUse: asBoolean(record.commercialUse),
  };
}

function toSourceAttribution(record: LooseRecord): SourceAttribution {
  return {
    id: asString(record.id),
    characterId: asString(record.characterId),
    sourceKind: record.sourceKind as SourceAttribution["sourceKind"],
    sourceLabel: asString(record.sourceLabel),
    sourceUrl: asString(record.sourceUrl),
    licenseName: asString(record.licenseName),
    attributionText: asString(record.attributionText),
    importedText: asString(record.importedText) || undefined,
    originalAuthor: asString(record.originalAuthor) || undefined,
    importedAt: toIso(record.importedAt as Date | string | null | undefined) ?? new Date().toISOString(),
  };
}

function toProfile(record: LooseRecord): Profile {
  return {
    id: asString(record.id),
    userId: asString(record.userId),
    handle: asString(record.handle),
    displayName: asString(record.displayName),
    bio: asString(record.bio),
    holdingsVisibility: asBoolean(record.holdingsVisibility),
    favoriteTags: asStringArray(record.favoriteTags),
    pinnedCharacterIds: asStringArray(record.pinnedCharacterIds),
    equippedFrameAsset: asString(record.equippedFrameAsset) || undefined,
    equippedThemeAsset: asString(record.equippedThemeAsset) || undefined,
  };
}

function toWallet(record: LooseRecord): Wallet {
  return {
    id: asString(record.id),
    userId: asString(record.userId),
    softBalance: asNumber(record.softBalance),
    premiumBalance: asNumber(record.premiumBalance),
  };
}

function toUser(record: LooseRecord): User {
  return {
    id: asString(record.id),
    email: asString(record.email) || undefined,
    name: asString(record.name, "Supporter"),
    image: asString(record.image) || undefined,
    role: record.role as User["role"],
  };
}

function toShopItem(record: LooseRecord): ShopItem {
  const unlockPayload = isRecord(record.unlockPayload)
    ? Object.fromEntries(
        Object.entries(record.unlockPayload).filter((entry): entry is [string, string] => {
          return typeof entry[1] === "string";
        }),
      )
    : {};

  return {
    id: asString(record.id),
    collectionId: asString(record.collectionId),
    slug: asString(record.slug),
    title: asString(record.title),
    description: asString(record.description),
    kind: record.kind as ShopItem["kind"],
    currencyType: record.currencyType as ShopItem["currencyType"],
    price: asNumber(record.price),
    previewLabel: asString(record.previewLabel),
    unlockPayload,
    published: asBoolean(record.published),
  };
}

function toPosition(record: LooseRecord): SupportPosition {
  return {
    id: asString(record.id),
    userId: asString(record.userId),
    characterId: asString(record.characterId),
    units: asNumber(record.units),
    averageCost: asNumber(record.averageCost),
    updatedAt: toIso(record.updatedAt as Date | string | null | undefined) ?? new Date().toISOString(),
  };
}

function toInventoryItem(record: LooseRecord): InventoryItem {
  return {
    id: asString(record.id),
    userId: asString(record.userId),
    shopItemId: asString(record.shopItemId),
    equipped: asBoolean(record.equipped),
    createdAt: toIso(record.createdAt as Date | string | null | undefined) ?? new Date().toISOString(),
  };
}

function toComfortMode(record: LooseRecord): ComfortMode {
  return {
    id: asString(record.id),
    slug: asString(record.slug),
    title: asString(record.title),
    subtitle: asString(record.subtitle),
    description: asString(record.description),
    promptLabel: asString(record.promptLabel),
    accentFrom: asString(record.accentFrom),
    accentTo: asString(record.accentTo),
    sortOrder: asNumber(record.sortOrder),
  };
}

function toComfortContent(record: LooseRecord): ComfortContent {
  return {
    id: asString(record.id),
    modeId: asString(record.modeId),
    characterId: asString(record.characterId) || undefined,
    kind: record.kind as ComfortContent["kind"],
    title: asString(record.title),
    body: asString(record.body),
    mediaUrl: asString(record.mediaUrl) || undefined,
    sweetnessLevel: asNumber(record.sweetnessLevel),
    unlockShopItemId: asString(record.unlockShopItemId) || undefined,
    published: asBoolean(record.published),
    metadata: toJsonRecord(record.metadata as Prisma.JsonValue | null | undefined),
  };
}

async function ensureSeeded() {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  if (!globalForStore.__acgPolymarketSeedPromise) {
    globalForStore.__acgPolymarketSeedPromise = prisma.user.count().then(async (count) => {
      if (count === 0) {
        await seedDatabase();
      }
    });
  }

  await globalForStore.__acgPolymarketSeedPromise;
}

function getUserId(userId?: string) {
  return userId ?? process.env.DEMO_USER_ID ?? "viewer-001";
}

async function requireUser(db: Db | Tx = prisma, userId?: string) {
  const activeUserId = getUserId(userId);
  const existing = await db.user.findUnique({
    where: { id: activeUserId },
    include: { profile: true, wallet: true },
  });

  if (existing) {
    return existing;
  }

  return db.user.create({
    data: {
      id: activeUserId,
      email: `${activeUserId}@demo.local`,
      name: "Demo Supporter",
      role: process.env.DEMO_ADMIN_ENABLED === "true" ? "ADMIN" : "USER",
      profile: {
        create: {
          handle: activeUserId.replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
          displayName: "Demo Supporter",
          bio: "Public beta supporter profile.",
          favoriteTags: [],
          pinnedCharacterIds: [],
        },
      },
      wallet: {
        create: {
          softBalance: STARTER_BALANCE,
          premiumBalance: 0,
        },
      },
    },
    include: { profile: true, wallet: true },
  });
}

async function requireAdmin(db: Db | Tx = prisma, userId?: string) {
  const user = await requireUser(db, userId);
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (
    user.role !== "ADMIN" &&
    process.env.DEMO_ADMIN_ENABLED !== "true" &&
    (!user.email || !adminEmails.includes(user.email.toLowerCase()))
  ) {
    throw new Error("Admin privileges are required.");
  }

  return user;
}

async function requireCharacter(
  db: Db | Tx,
  identifier: string,
  include: Prisma.CharacterInclude = characterInclude,
) {
  const character = await db.character.findFirst({
    where: { OR: [{ id: identifier }, { slug: identifier }] },
    include,
  });

  if (!character) {
    throw new Error("Character not found.");
  }

  return character;
}

async function requireWallet(db: Db | Tx, userId: string) {
  const wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    throw new Error("Wallet not found.");
  }

  return wallet;
}

async function createLedgerEntry(
  db: Tx,
  wallet: { id: string; softBalance: number },
  delta: number,
  referenceType: LedgerReferenceType,
  referenceId: string,
  idempotencyKey: string,
  currencyType: CurrencyType = "SOFT",
) {
  const existing = await db.ledgerEntry.findUnique({ where: { idempotencyKey } });
  if (existing) {
    throw new Error("This action was already processed.");
  }

  const nextBalance = wallet.softBalance + delta;
  if (nextBalance < 0) {
    throw new Error("Balance cannot go negative.");
  }

  await db.wallet.update({
    where: { id: wallet.id },
    data: { softBalance: nextBalance },
  });

  wallet.softBalance = nextBalance;
  return db.ledgerEntry.create({
    data: {
      walletId: wallet.id,
      currencyType,
      delta,
      balanceAfter: nextBalance,
      referenceType,
      referenceId,
      idempotencyKey,
    },
  });
}

async function createNotification(
  db: Tx,
  userId: string,
  title: string,
  body: string,
  type: "SYSTEM" | "REWARD" | "TRADE" | "SOCIAL" | "SHOP",
) {
  return db.notification.create({
    data: { userId, title, body, type },
  });
}

export async function getCurrentViewer() {
  await ensureSeeded();
  const user = await requireUser();
  const profile = user.profile ?? (await prisma.profile.findUniqueOrThrow({ where: { userId: user.id } }));
  const wallet = user.wallet ?? (await requireWallet(prisma, user.id));

  return { user: toUser(user), profile: toProfile(profile), wallet: toWallet(wallet) };
}

export async function listCharacters(filters?: {
  search?: string;
  tag?: string;
  rightsType?: string;
  featuredOnly?: boolean;
}) {
  await ensureSeeded();
  const search = filters?.search?.trim();
  const tag = filters?.tag?.trim();
  const rightsType = filters?.rightsType?.toUpperCase() as "ORIGINAL" | "LICENSED" | undefined;

  const characters = await prisma.character.findMany({
    where: {
      ...(filters?.featuredOnly ? { isFeatured: true } : {}),
      ...(rightsType === "ORIGINAL" || rightsType === "LICENSED" ? { rightsType } : {}),
      ...(tag ? { tags: { some: { label: { equals: tag, mode: "insensitive" } } } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { title: { contains: search, mode: "insensitive" } },
              { summary: { contains: search, mode: "insensitive" } },
              { tags: { some: { label: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    include: { tags: true },
    orderBy: [{ supporterCount: "desc" }, { circulatingUnits: "desc" }],
  });

  return characters.map(toCharacter);
}

export async function getCharacterView(identifier: string): Promise<CharacterView> {
  await ensureSeeded();
  const record = await requireCharacter(prisma, identifier);
  const character = toCharacter(record);
  const relatedCharacters = character.relatedCharacterIds.length
    ? await prisma.character.findMany({
        where: { id: { in: character.relatedCharacterIds } },
        include: { tags: true },
      })
    : [];

  const comments = await prisma.comment.findMany({
    where: { characterId: character.id },
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
  });

  return {
    character,
    series: toSeries(record.series),
    assets: record.assets.map(toAsset),
    rightsGrants: record.rightsGrants.map(toRightsGrant),
    sourceAttribution: record.sourceAttribution ? toSourceAttribution(record.sourceAttribution) : undefined,
    attributes: (record.attributes as unknown as AttributeWithDefinition[])
      .map((attribute) => ({
        id: attribute.definition.id,
        key: attribute.definition.key,
        label: attribute.definition.label,
        valueType: attribute.definition.valueType,
        filterable: attribute.definition.filterable,
        sortable: attribute.definition.sortable,
        displayable: attribute.definition.displayable,
        sensitive: attribute.definition.sensitive,
        spoiler: attribute.definition.spoiler,
        displayOrder: attribute.definition.displayOrder,
        value: attribute.value,
      }))
      .sort((left, right) => left.displayOrder - right.displayOrder),
    quote: getBuyQuote(character),
    sellQuote: getSellQuote(character),
    relatedCharacters: relatedCharacters.map(toCharacter),
    comments: comments.map((comment) => ({
      id: comment.id,
      userId: comment.userId,
      characterId: comment.characterId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: comment.user.profile ? toProfile(comment.user.profile) : undefined,
    })),
    reactions: (await prisma.reaction.findMany({ where: { characterId: character.id } })).map((reaction) => ({
      id: reaction.id,
      userId: reaction.userId,
      characterId: reaction.characterId,
      kind: reaction.kind as Reaction["kind"],
      createdAt: reaction.createdAt.toISOString(),
    })),
  };
}

export async function getPortfolioView(userId?: string): Promise<PortfolioView> {
  await ensureSeeded();
  const user = await requireUser(prisma, userId);
  const profile = user.profile ?? (await prisma.profile.findUniqueOrThrow({ where: { userId: user.id } }));
  const wallet = user.wallet ?? (await requireWallet(prisma, user.id));

  const positions = await prisma.supportPosition.findMany({
    where: { userId: user.id, units: { gt: 0 } },
    include: { character: { include: { tags: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const inventory = await prisma.inventoryItem.findMany({
    where: { userId: user.id },
    include: { shopItem: true },
    orderBy: { createdAt: "desc" },
  });
  const watchlist = await prisma.watchlistItem.findMany({
    where: { userId: user.id },
    include: { character: { include: { tags: true } } },
    orderBy: { createdAt: "desc" },
  });
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return {
    profile: toProfile(profile),
    wallet: toWallet(wallet),
    positions: positions
      .map((position) => {
        const character = toCharacter(position.character);
        const currentQuote = getBuyQuote(character);
        return {
          ...toPosition(position),
          character,
          currentQuote,
          currentValue: currentQuote * position.units,
        };
      })
      .sort((left, right) => right.currentValue - left.currentValue),
    inventory: inventory.map((entry) => ({
      ...toInventoryItem(entry),
      item: toShopItem(entry.shopItem),
    })),
    watchlist: watchlist.map((entry) => toCharacter(entry.character)),
    notifications: notifications.map((notification) => ({
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      readAt: toIso(notification.readAt),
      createdAt: notification.createdAt.toISOString(),
    })),
  };
}

export async function getShopItems() {
  await ensureSeeded();
  return (await prisma.shopItem.findMany({ where: { published: true }, orderBy: { price: "asc" } })).map(
    toShopItem,
  );
}

export async function buySupport(
  identifier: string,
  quantity: number,
  userId?: string,
  idempotencyKey?: string,
) {
  await ensureSeeded();

  return prisma.$transaction(async (tx) => {
    const user = await requireUser(tx, userId);
    const characterRecord = await requireCharacter(tx, identifier, { tags: true });
    const character = toCharacter(characterRecord);
    const wallet = await requireWallet(tx, user.id);
    const position = await tx.supportPosition.upsert({
      where: { userId_characterId: { userId: user.id, characterId: character.id } },
      create: { userId: user.id, characterId: character.id, units: 0, averageCost: 0 },
      update: {},
    });
    const { totalCost, unitPrice } = calculateBuyBatchCost(character, quantity);

    if (wallet.softBalance < totalCost) {
      throw new Error("Not enough SUP to complete this support purchase.");
    }

    await createLedgerEntry(
      tx,
      wallet,
      -totalCost,
      "BUY_SUPPORT",
      character.id,
      idempotencyKey ?? `buy-${user.id}-${character.id}-${Date.now()}-${quantity}`,
    );

    const nextUnits = position.units + quantity;
    const averageCost = Math.round(
      (position.averageCost * position.units + totalCost) / Math.max(nextUnits, 1),
    );

    const updatedPosition = await tx.supportPosition.update({
      where: { id: position.id },
      data: { units: nextUnits, averageCost },
    });
    await tx.character.update({
      where: { id: character.id },
      data: {
        circulatingUnits: { increment: quantity },
        supporterCount: position.units === 0 ? { increment: 1 } : undefined,
      },
    });
    const trade = await tx.trade.create({
      data: {
        userId: user.id,
        characterId: character.id,
        side: "BUY",
        quantity,
        totalCost,
        unitPrice,
      },
    });
    await createNotification(
      tx,
      user.id,
      `Supported ${character.name}`,
      `You added ${quantity} support unit${quantity > 1 ? "s" : ""} at ${unitPrice} SUP.`,
      "TRADE",
    );

    return {
      trade: {
        ...trade,
        side: "BUY" as const,
        createdAt: trade.createdAt.toISOString(),
      },
      wallet: toWallet(wallet),
      position: toPosition(updatedPosition),
      quote: getBuyQuote({ ...character, circulatingUnits: character.circulatingUnits + quantity }),
    };
  }, balanceTransactionOptions);
}

export async function sellSupport(
  identifier: string,
  quantity: number,
  userId?: string,
  idempotencyKey?: string,
) {
  await ensureSeeded();

  return prisma.$transaction(async (tx) => {
    const user = await requireUser(tx, userId);
    const characterRecord = await requireCharacter(tx, identifier, { tags: true });
    const character = toCharacter(characterRecord);
    const wallet = await requireWallet(tx, user.id);
    const position = await tx.supportPosition.upsert({
      where: { userId_characterId: { userId: user.id, characterId: character.id } },
      create: { userId: user.id, characterId: character.id, units: 0, averageCost: 0 },
      update: {},
    });

    if (position.units < quantity) {
      throw new Error("You cannot sell more support units than you hold.");
    }

    const { totalReturn, unitPrice } = calculateSellBatchReturn(character, quantity);
    await createLedgerEntry(
      tx,
      wallet,
      totalReturn,
      "SELL_SUPPORT",
      character.id,
      idempotencyKey ?? `sell-${user.id}-${character.id}-${Date.now()}-${quantity}`,
    );

    const nextUnits = position.units - quantity;
    const updatedPosition = await tx.supportPosition.update({
      where: { id: position.id },
      data: { units: nextUnits, averageCost: nextUnits === 0 ? 0 : position.averageCost },
    });
    await tx.character.update({
      where: { id: character.id },
      data: {
        circulatingUnits: Math.max(character.circulatingUnits - quantity, 0),
        supporterCount:
          nextUnits === 0 ? Math.max(character.supporterCount - 1, 0) : character.supporterCount,
      },
    });
    const trade = await tx.trade.create({
      data: {
        userId: user.id,
        characterId: character.id,
        side: "SELL",
        quantity,
        totalCost: totalReturn,
        unitPrice,
      },
    });
    await createNotification(
      tx,
      user.id,
      `Trimmed ${character.name}`,
      `You sold ${quantity} support unit${quantity > 1 ? "s" : ""} for ${totalReturn} SUP.`,
      "TRADE",
    );

    return {
      trade: {
        ...trade,
        side: "SELL" as const,
        createdAt: trade.createdAt.toISOString(),
      },
      wallet: toWallet(wallet),
      position: toPosition(updatedPosition),
      quote: getBuyQuote({ ...character, circulatingUnits: Math.max(character.circulatingUnits - quantity, 0) }),
    };
  }, balanceTransactionOptions);
}

export async function claimDailyReward(userId?: string) {
  await ensureSeeded();

  return prisma.$transaction(async (tx) => {
    const user = await requireUser(tx, userId);
    const wallet = await requireWallet(tx, user.id);
    const dayKey = getHongKongDayKey();
    const existing = await tx.dailyRewardClaim.findUnique({
      where: { userId_dayKey: { userId: user.id, dayKey } },
    });

    if (existing) {
      throw new Error("Today's check-in reward has already been claimed.");
    }

    const claim = await tx.dailyRewardClaim.create({
      data: { userId: user.id, dayKey, amount: DAILY_CHECK_IN_REWARD },
    });
    await createLedgerEntry(
      tx,
      wallet,
      DAILY_CHECK_IN_REWARD,
      "DAILY_REWARD",
      dayKey,
      `daily-${user.id}-${dayKey}`,
    );
    await createNotification(
      tx,
      user.id,
      "Daily reward claimed",
      `You received ${DAILY_CHECK_IN_REWARD} SUP.`,
      "REWARD",
    );

    return {
      claim: { ...claim, claimedAt: claim.claimedAt.toISOString() },
      wallet: toWallet(wallet),
    };
  }, balanceTransactionOptions);
}

export async function claimAdReward(userId?: string, idempotencyKey?: string) {
  await ensureSeeded();

  return prisma.$transaction(async (tx) => {
    const user = await requireUser(tx, userId);
    const wallet = await requireWallet(tx, user.id);
    const dayKey = getHongKongDayKey();
    const count = await tx.adRewardClaim.count({ where: { userId: user.id, dayKey } });

    if (count >= AD_REWARD_DAILY_LIMIT) {
      throw new Error("You have reached today's ad reward limit.");
    }

    const claim = await tx.adRewardClaim.create({
      data: { userId: user.id, dayKey, amount: AD_REWARD },
    });
    await createLedgerEntry(
      tx,
      wallet,
      AD_REWARD,
      "AD_REWARD",
      dayKey,
      idempotencyKey ?? `ad-${user.id}-${dayKey}-${count + 1}`,
    );
    await createNotification(
      tx,
      user.id,
      "Ad reward received",
      `You picked up ${AD_REWARD} SUP from a rewarded ad.`,
      "REWARD",
    );

    return {
      claim: { ...claim, claimedAt: claim.claimedAt.toISOString() },
      wallet: toWallet(wallet),
    };
  }, balanceTransactionOptions);
}

export async function toggleWatchlist(characterId: string, userId?: string) {
  await ensureSeeded();
  const user = await requireUser(prisma, userId);
  await requireCharacter(prisma, characterId, { tags: true });
  const existing = await prisma.watchlistItem.findUnique({
    where: { userId_characterId: { userId: user.id, characterId } },
  });

  if (existing) {
    await prisma.watchlistItem.delete({ where: { id: existing.id } });
    return { watching: false };
  }

  await prisma.watchlistItem.create({ data: { userId: user.id, characterId } });
  return { watching: true };
}

export async function addComment(characterId: string, content: string, userId?: string) {
  await ensureSeeded();
  const user = await requireUser(prisma, userId);
  await requireCharacter(prisma, characterId, { tags: true });

  if (content.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comments must stay under ${MAX_COMMENT_LENGTH} characters.`);
  }

  const comment = await prisma.comment.create({
    data: { userId: user.id, characterId, content },
  });

  return {
    id: comment.id,
    userId: comment.userId,
    characterId: comment.characterId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
  };
}

export async function toggleReaction(characterId: string, kind: Reaction["kind"], userId?: string) {
  await ensureSeeded();
  const user = await requireUser(prisma, userId);
  await requireCharacter(prisma, characterId, { tags: true });
  const existing = await prisma.reaction.findUnique({
    where: { userId_characterId_kind: { userId: user.id, characterId, kind } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return { active: false };
  }

  await prisma.reaction.create({ data: { userId: user.id, characterId, kind } });
  return { active: true };
}

export async function createReport(input: {
  reason: string;
  detail?: string;
  characterId?: string;
  commentId?: string;
  userId?: string;
}) {
  await ensureSeeded();
  const user = await requireUser(prisma, input.userId);

  return prisma.report.create({
    data: {
      userId: user.id,
      characterId: input.characterId,
      commentId: input.commentId,
      reason: input.reason,
      detail: input.detail,
    },
  });
}

export async function purchaseShopItem(
  itemId: string,
  userId?: string,
  equip = true,
  idempotencyKey?: string,
) {
  await ensureSeeded();

  return prisma.$transaction(async (tx) => {
    const user = await requireUser(tx, userId);
    const wallet = await requireWallet(tx, user.id);
    const profile = user.profile ?? (await tx.profile.findUniqueOrThrow({ where: { userId: user.id } }));
    const item = await tx.shopItem.findFirst({ where: { id: itemId, published: true } });

    if (!item) {
      throw new Error("Shop item not found.");
    }

    const existing = await tx.inventoryItem.findUnique({
      where: { userId_shopItemId: { userId: user.id, shopItemId: item.id } },
    });

    let inventoryItem = existing;
    if (!inventoryItem) {
      if (item.currencyType === "SOFT") {
        await createLedgerEntry(
          tx,
          wallet,
          -item.price,
          "SHOP_PURCHASE",
          item.id,
          idempotencyKey ?? `shop-${user.id}-${item.id}-${Date.now()}`,
        );
      }

      inventoryItem = await tx.inventoryItem.create({
        data: { userId: user.id, shopItemId: item.id, equipped: false },
      });
    }

    if (equip) {
      const sameKindItems = await tx.shopItem.findMany({ where: { kind: item.kind } });
      await tx.inventoryItem.updateMany({
        where: {
          userId: user.id,
          shopItemId: { in: sameKindItems.map((entry) => entry.id) },
        },
        data: { equipped: false },
      });
      inventoryItem = await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { equipped: true },
      });

      const unlockPayload =
        item.unlockPayload && typeof item.unlockPayload === "object" && !Array.isArray(item.unlockPayload)
          ? (item.unlockPayload as Record<string, string>)
          : {};
      await tx.profile.update({
        where: { id: profile.id },
        data: {
          equippedFrameAsset: item.kind === "AVATAR_FRAME" ? unlockPayload.assetId : undefined,
          equippedThemeAsset: item.kind === "PROFILE_THEME" ? unlockPayload.assetId : undefined,
        },
      });
    }

    await tx.notification.create({
      data: {
        userId: user.id,
        title: "Cosmetic unlocked",
        body: `${item.title} is now in your locker.`,
        type: "SHOP",
      },
    });

    return {
      item: toShopItem(item),
      inventoryItem: toInventoryItem(inventoryItem),
      wallet: toWallet(wallet),
    };
  }, balanceTransactionOptions);
}

export async function createAdminCharacter(
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
  await ensureSeeded();
  await requireAdmin(prisma, userId);

  for (const label of input.tags) {
    await prisma.characterTag.upsert({ where: { label }, create: { label }, update: {} });
  }

  const character = await prisma.character.create({
    data: {
      seriesId: input.seriesId,
      slug: slugify(input.name),
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
      accentFrom: input.accentFrom,
      accentTo: input.accentTo,
      tags: { connect: input.tags.map((label) => ({ label })) },
    },
    include: { tags: true },
  });

  return toCharacter(character);
}

export async function createAdminAsset(
  input: Omit<CharacterAsset, "id" | "version" | "publishedAt"> & {
    workflowStatus: AssetWorkflowStatus;
    sourceKind?: AssetSourceKind;
  },
  userId?: string,
) {
  await ensureSeeded();
  await requireAdmin(prisma, userId);
  validateAssetSource(input);

  const asset = await prisma.characterAsset.create({
    data: {
      characterId: input.characterId,
      kind: input.kind,
      label: input.label,
      storageKey: input.storageKey,
      altText: input.altText,
      workflowStatus: input.workflowStatus,
      publishedAt: input.workflowStatus === "PUBLISHED" ? new Date() : undefined,
      rightsGrantId: input.rightsGrantId,
      metadata: input.metadata,
      sourceKind: input.sourceKind,
      sourceUrl: input.sourceUrl,
      attributionText: input.attributionText,
      takedownContact: input.takedownContact,
    },
  });

  return toAsset(asset);
}

export async function createAdminShopItem(
  input: Omit<ShopItem, "id" | "slug" | "published" | "unlockPayload"> & { assetId: string },
  userId?: string,
) {
  await ensureSeeded();
  await requireAdmin(prisma, userId);

  const asset = await prisma.characterAsset.findUnique({ where: { id: input.assetId } });
  if (!asset) {
    throw new Error("Linked asset not found.");
  }

  const item = await prisma.shopItem.create({
    data: {
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
    },
  });

  return toShopItem(item);
}

export async function importBangumiCharacter(
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
  await ensureSeeded();
  await requireAdmin(prisma, userId);
  validateBangumiAttribution(input);

  return prisma.$transaction(async (tx) => {
    const series = await tx.series.upsert({
      where: { slug: slugify(input.seriesTitle) },
      create: {
        slug: slugify(input.seriesTitle),
        title: input.seriesTitle,
        summary: "Imported metadata shell created from Bangumi-compatible source data.",
        rightsType: "LICENSED",
        metadataOnly: true,
        bangumiUrl: input.sourceUrl,
      },
      update: {
        title: input.seriesTitle,
        bangumiUrl: input.sourceUrl,
      },
    });

    for (const label of input.tags) {
      await tx.characterTag.upsert({ where: { label }, create: { label }, update: {} });
    }

    const character = await tx.character.create({
      data: {
        seriesId: series.id,
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
        tags: { connect: input.tags.map((label) => ({ label })) },
      },
      include: { tags: true },
    });

    const grant = await tx.rightsGrant.create({
      data: {
        seriesId: series.id,
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
      },
    });
    const attribution = await tx.sourceAttribution.create({
      data: {
        characterId: character.id,
        sourceKind: "BANGUMI",
        sourceLabel: input.sourceLabel,
        sourceUrl: input.sourceUrl,
        licenseName: input.licenseName ?? "CC BY-SA",
        attributionText:
          input.attributionText ?? "Metadata adapted from Bangumi with attribution preserved.",
        importedText: input.importedText,
        originalAuthor: input.originalAuthor ?? "Bangumi contributors",
      },
    });

    return {
      series: toSeries(series),
      character: toCharacter(character),
      grant: toRightsGrant(grant),
      attribution: toSourceAttribution(attribution),
    };
  });
}

export async function importBangumiSubject(subjectId: string, userId?: string) {
  await ensureSeeded();
  await requireAdmin(prisma, userId);
  const sample = bangumiImportSamples.find((entry) => entry.subjectId === subjectId);

  if (!sample) {
    throw new Error("Sample subject is not configured for beta import.");
  }

  await seedDatabase();

  return {
    sample,
    imported: sample.characters.length,
  };
}

export async function getAdminSnapshot() {
  await ensureSeeded();
  const [characters, assets, rightsGrants, reports, shopItems, sourceAttributions] =
    await Promise.all([
      prisma.character.findMany({ include: { tags: true }, orderBy: { createdAt: "desc" } }),
      prisma.characterAsset.findMany({ orderBy: { id: "asc" } }),
      prisma.rightsGrant.findMany({ orderBy: { id: "asc" } }),
      prisma.report.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.shopItem.findMany({ orderBy: { id: "asc" } }),
      prisma.sourceAttribution.findMany({ orderBy: { importedAt: "desc" } }),
    ]);

  return {
    characters: characters.map(toCharacter),
    assets: assets.map(toAsset),
    rightsGrants: rightsGrants.map(toRightsGrant),
    reports: reports.map((report) => ({ ...report, createdAt: report.createdAt.toISOString() })),
    shopItems: shopItems.map(toShopItem),
    sourceAttributions: sourceAttributions.map(toSourceAttribution),
  };
}

export async function getPublicSnapshot() {
  return {
    viewer: await getCurrentViewer(),
    characters: await listCharacters(),
    shopItems: await getShopItems(),
  };
}

export function resetDemoStore() {
  globalForStore.__acgPolymarketSeedPromise = undefined;
}

export async function getCommentCount(characterId: string) {
  await ensureSeeded();
  return prisma.comment.count({ where: { characterId } });
}

export async function getWatchlistIds(userId?: string) {
  await ensureSeeded();
  const user = await requireUser(prisma, userId);
  const items = await prisma.watchlistItem.findMany({ where: { userId: user.id } });
  return items.map((entry) => entry.characterId);
}

export async function getReactionSummary(characterId: string) {
  await ensureSeeded();
  const reactions = await prisma.reaction.findMany({ where: { characterId } });
  return reactions.reduce<Record<string, number>>((summary, reaction) => {
    summary[reaction.kind] = (summary[reaction.kind] ?? 0) + 1;
    return summary;
  }, {});
}

export async function getRecentTrades(limit = 8) {
  await ensureSeeded();
  const trades = await prisma.trade.findMany({
    include: { character: { include: { tags: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return trades.map((trade) => ({
    id: trade.id,
    userId: trade.userId,
    characterId: trade.characterId,
    side: trade.side as "BUY" | "SELL",
    quantity: trade.quantity,
    totalCost: trade.totalCost,
    unitPrice: trade.unitPrice,
    createdAt: trade.createdAt.toISOString(),
    character: toCharacter(trade.character),
  }));
}

export async function getUserByHandle(handle: string) {
  await ensureSeeded();
  const profile = await prisma.profile.findUnique({ where: { handle } });
  if (!profile) {
    throw new Error("Profile not found.");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: profile.userId } });
  const wallet = await requireWallet(prisma, profile.userId);
  const portfolio = await getPortfolioView(profile.userId);

  return {
    user: toUser(user),
    profile: toProfile(profile),
    wallet: toWallet(wallet),
    positions: portfolio.positions,
  };
}

export async function bootstrapStarterBalance(userId?: string) {
  await ensureSeeded();
  const user = await requireUser(prisma, userId);
  const wallet = await requireWallet(prisma, user.id);

  if (wallet.softBalance > 0) {
    return toWallet(wallet);
  }

  await prisma.$transaction(async (tx) => {
    const txWallet = await requireWallet(tx, user.id);
    await createLedgerEntry(
      tx,
      txWallet,
      STARTER_BALANCE,
      "STARTER_GRANT",
      "starter-balance",
      `starter-${user.id}`,
    );
  }, balanceTransactionOptions);

  return toWallet(await requireWallet(prisma, user.id));
}

export async function getProfiles() {
  await ensureSeeded();
  return (await prisma.profile.findMany()).map(toProfile);
}

export async function getUsers() {
  await ensureSeeded();
  return (await prisma.user.findMany()).map(toUser);
}

export async function listComfortModes() {
  await ensureSeeded();
  return (await prisma.comfortMode.findMany({ orderBy: { sortOrder: "asc" } })).map(toComfortMode);
}

export async function getComfortModeView(slug: string): Promise<ComfortModeView> {
  await ensureSeeded();
  const mode = await prisma.comfortMode.findUnique({
    where: { slug },
    include: {
      contents: {
        where: { published: true },
        include: { character: { include: { tags: true } } },
        orderBy: { sweetnessLevel: "desc" },
      },
    },
  });

  if (!mode) {
    throw new Error("Comfort mode not found.");
  }

  return {
    ...toComfortMode(mode),
    contents: mode.contents.map((content) => ({
      ...toComfortContent(content),
      character: content.character ? toCharacter(content.character) : undefined,
    })),
  };
}

export async function createComfortSession(input: {
  modeSlug?: string;
  needText?: string;
  characterId?: string;
  note?: string;
  userId?: string;
}) {
  await ensureSeeded();
  const user = await requireUser(prisma, input.userId);
  const modes = await listComfortModes();
  const modeSlug = input.modeSlug ?? matchComfortMode(input.needText ?? "", modes);
  const mode = modes.find((entry) => entry.slug === modeSlug);

  if (!mode) {
    throw new Error("Comfort mode not found.");
  }

  const session = await prisma.comfortSession.create({
    data: {
      userId: user.id,
      modeSlug: mode.slug,
      characterId: input.characterId,
      note: input.note ?? input.needText,
    },
  });

  return {
    id: session.id,
    modeSlug: session.modeSlug,
    characterId: session.characterId,
    note: session.note,
    createdAt: session.createdAt.toISOString(),
  };
}

export async function createComfortReaction(input: {
  modeSlug: string;
  contentId?: string;
  kind: "SOOTHED" | "SWEET" | "REPLAY";
  userId?: string;
}) {
  await ensureSeeded();
  const user = await requireUser(prisma, input.userId);
  const reaction = await prisma.comfortReaction.create({
    data: {
      userId: user.id,
      modeSlug: input.modeSlug,
      contentId: input.contentId,
      kind: input.kind,
    },
  });

  return {
    id: reaction.id,
    modeSlug: reaction.modeSlug,
    contentId: reaction.contentId,
    kind: reaction.kind,
    createdAt: reaction.createdAt.toISOString(),
  };
}

export async function createAdminComfortContent(
  input: {
    modeSlug: string;
    characterId?: string;
    kind: ComfortContent["kind"];
    title: string;
    body: string;
    mediaUrl?: string;
    sweetnessLevel?: number;
    unlockShopItemId?: string;
    published?: boolean;
  },
  userId?: string,
) {
  await ensureSeeded();
  await requireAdmin(prisma, userId);
  const mode = await prisma.comfortMode.findUnique({ where: { slug: input.modeSlug } });

  if (!mode) {
    throw new Error("Comfort mode not found.");
  }

  const content = await prisma.comfortContent.create({
    data: {
      modeId: mode.id,
      characterId: input.characterId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      mediaUrl: input.mediaUrl,
      sweetnessLevel: input.sweetnessLevel ?? 80,
      unlockShopItemId: input.unlockShopItemId,
      published: input.published ?? true,
    },
  });

  return toComfortContent(content);
}
