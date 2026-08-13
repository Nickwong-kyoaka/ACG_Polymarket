import { Prisma } from "@prisma/client";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
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
import { prisma } from "@/lib/prisma";
import { AuthenticationError, AuthorizationError, AppError } from "@/lib/api";
import { getOptionalSessionUserId } from "@/lib/auth";
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

type Db = typeof prisma;
type Tx = Prisma.TransactionClient;

const balanceTransactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 15_000,
};

function requestHash(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function withSerializableRetry<T>(operation: (tx: Tx) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, balanceTransactionOptions);
    } catch (error) {
      if (
        attempt === 2 ||
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2034"
      ) {
        throw error;
      }
    }
  }

  throw new AppError("The operation could not be completed safely. Try again.", 409, "CONFLICT");
}

async function runIdempotentMutation<T>(input: {
  userId: string;
  scope: string;
  key: string;
  payload: unknown;
  operation: (tx: Tx) => Promise<T>;
}) {
  const hash = requestHash(input.payload);

  return withSerializableRetry(async (tx) => {
    const existing = await tx.idempotencyRecord.findUnique({
      where: { userId_scope_key: { userId: input.userId, scope: input.scope, key: input.key } },
    });

    if (existing) {
      if (existing.requestHash !== hash) {
        throw new AppError(
          "This idempotency key was already used for a different request.",
          409,
          "IDEMPOTENCY_CONFLICT",
        );
      }
      if (existing.completedAt && existing.response) {
        return existing.response as unknown as T;
      }
      throw new AppError("This action is already being processed.", 409, "ACTION_IN_PROGRESS");
    }

    const record = await tx.idempotencyRecord.create({
      data: {
        userId: input.userId,
        scope: input.scope,
        key: input.key,
        requestHash: hash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const result = await input.operation(tx);
    await tx.idempotencyRecord.update({
      where: { id: record.id },
      data: {
        response: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
    return result;
  });
}

const characterInclude = {
  series: { include: { locales: true } },
  tags: true,
  attributes: { include: { definition: { include: { locales: true } } } },
  assets: true,
  rightsGrants: true,
  sourceAttribution: true,
  locales: true,
} satisfies Prisma.CharacterInclude;

type StoreLocale = "en" | "zh-Hant";

function dbLocale(locale: StoreLocale) {
  return locale === "zh-Hant" ? "ZH_HANT" : "EN";
}

function localizedFields(record: LooseRecord, locale?: StoreLocale) {
  if (!locale || !Array.isArray(record.locales)) {
    return undefined;
  }
  return record.locales.find(
    (entry): entry is LooseRecord => isRecord(entry) && entry.locale === dbLocale(locale),
  );
}

const missionDefinitions = {
  COMFORT_SESSION: {
    reward: 10,
    en: ["Open a comfort room", "Start one gentle comfort session."],
    zhHant: ["走進安慰室", "開始一次溫柔的安慰流程。"],
  },
  POSITIVE_REACTION: {
    reward: 15,
    en: ["Send a positive signal", "Cheer, heart, or hype a character you love."],
    zhHant: ["送出正向訊號", "為喜歡的角色送上應援、愛心或喝采。"],
  },
  SUPPORT_OR_WATCH: {
    reward: 20,
    en: ["Keep a favorite close", "Watch or support one character booth."],
    zhHant: ["把本命留在身邊", "收藏或應援一個角色攤位。"],
  },
} as const;

const workDefinitions = {
  SHIFT_30M: { durationMs: 30 * 60 * 1000, reward: 10 },
  SHIFT_2H: { durationMs: 2 * 60 * 60 * 1000, reward: 30 },
  SHIFT_6H: { durationMs: 6 * 60 * 60 * 1000, reward: 60 },
} as const;

const DAILY_WORK_REWARD_LIMIT = 80;

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
    locales?: Array<{ locale: string; label: string }>;
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

function toCharacter(record: LooseRecord, locale?: StoreLocale): Character {
  const localized = localizedFields(record, locale);
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
    name: asString(localized?.name, asString(record.name)),
    title: asString(localized?.title, asString(record.title)),
    summary: asString(localized?.summary, asString(record.summary)),
    fandomPrompt: asString(localized?.fandomPrompt, asString(record.fandomPrompt)),
    mood: asString(localized?.mood, asString(record.mood)),
    rightsType: record.rightsType as Character["rightsType"],
    metadataOnly: asBoolean(record.metadataOnly),
    publishStatus: record.publishStatus as Character["publishStatus"],
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
    favoritePhrase: asString(localized?.favoritePhrase, asString(record.favoritePhrase)) || undefined,
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

function toSeries(record: LooseRecord, locale?: StoreLocale) {
  const localized = localizedFields(record, locale);
  return {
    id: asString(record.id),
    slug: asString(record.slug),
    title: asString(localized?.title, asString(record.title)),
    summary: asString(localized?.summary, asString(record.summary)),
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
    sourceLabel: asString(record.sourceLabel) || undefined,
    licenseName: asString(record.licenseName) || undefined,
    publicUrl: asString(record.publicUrl) || undefined,
    mimeType: asString(record.mimeType) || undefined,
    byteSize: asNumber(record.byteSize) || undefined,
    aiPrompt: asString(record.aiPrompt) || undefined,
    aiModel: asString(record.aiModel) || undefined,
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

function toShopItem(record: LooseRecord, locale?: StoreLocale): ShopItem {
  const localized = localizedFields(record, locale);
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
    title: asString(localized?.title, asString(record.title)),
    description: asString(localized?.description, asString(record.description)),
    kind: record.kind as ShopItem["kind"],
    currencyType: record.currencyType as ShopItem["currencyType"],
    price: asNumber(record.price),
    previewLabel: asString(localized?.previewLabel, asString(record.previewLabel)),
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

function toComfortMode(record: LooseRecord, locale?: StoreLocale): ComfortMode {
  const localized = localizedFields(record, locale);
  return {
    id: asString(record.id),
    slug: asString(record.slug),
    title: asString(localized?.title, asString(record.title)),
    subtitle: asString(localized?.subtitle, asString(record.subtitle)),
    description: asString(localized?.description, asString(record.description)),
    promptLabel: asString(localized?.promptLabel, asString(record.promptLabel)),
    accentFrom: asString(record.accentFrom),
    accentTo: asString(record.accentTo),
    sortOrder: asNumber(record.sortOrder),
  };
}

function toComfortContent(record: LooseRecord, locale?: StoreLocale): ComfortContent {
  const localized = localizedFields(record, locale);
  return {
    id: asString(record.id),
    modeId: asString(record.modeId),
    characterId: asString(record.characterId) || undefined,
    kind: record.kind as ComfortContent["kind"],
    title: asString(localized?.title, asString(record.title)),
    body: asString(localized?.body, asString(record.body)),
    mediaUrl: asString(record.mediaUrl) || undefined,
    assetId: asString(record.assetId) || undefined,
    sweetnessLevel: asNumber(record.sweetnessLevel),
    unlockShopItemId: asString(record.unlockShopItemId) || undefined,
    published: asBoolean(record.published),
    metadata: toJsonRecord(record.metadata as Prisma.JsonValue | null | undefined),
  };
}

async function ensureSeeded() {
  // Seeding is an explicit deploy/local setup step. Public requests never mutate catalog data.
}

async function getUserId(userId?: string) {
  const activeUserId = userId ?? (await getOptionalSessionUserId());
  if (!activeUserId) {
    throw new AuthenticationError();
  }
  return activeUserId;
}

async function requireUser(db: Db | Tx = prisma, userId?: string) {
  const activeUserId = await getUserId(userId);
  const existing = await db.user.findUnique({
    where: { id: activeUserId },
    include: { profile: true, wallet: true },
  });

  if (existing) {
    return existing;
  }

  throw new AuthenticationError("Your account session is no longer available. Please sign in again.");
}

async function requireAdmin(db: Db | Tx = prisma, userId?: string) {
  const user = await requireUser(db, userId);
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (
    user.role !== "ADMIN" &&
    (!user.email || !adminEmails.includes(user.email.toLowerCase()))
  ) {
    throw new AuthorizationError("Admin privileges are required.");
  }

  return user;
}

async function requireCharacter(
  db: Db | Tx,
  identifier: string,
  include: Prisma.CharacterInclude = characterInclude,
) {
  const character = await db.character.findFirst({
    where: { publishStatus: "PUBLISHED", OR: [{ id: identifier }, { slug: identifier }] },
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

async function completeMissionEvent(tx: Tx, userId: string, missionKey: keyof typeof missionDefinitions) {
  const dayKey = getHongKongDayKey();
  const definition = missionDefinitions[missionKey];
  await tx.dailyMissionProgress.upsert({
    where: { userId_dayKey_missionKey: { userId, dayKey, missionKey } },
    create: { userId, dayKey, missionKey, reward: definition.reward, completedAt: new Date() },
    update: { completedAt: new Date() },
  });
}

function signAdNonce(payload: string) {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "local-demo-secret")
    .update(payload)
    .digest("base64url");
}

function encodeAdNonce(input: { userId: string; dayKey: string; slot: number; expiresAt: number }) {
  const payload = Buffer.from(JSON.stringify(input)).toString("base64url");
  return `${payload}.${signAdNonce(payload)}`;
}

function decodeAdNonce(nonce: string) {
  const [payload, signature] = nonce.split(".");
  if (!payload || !signature) {
    throw new AppError("Invalid ad reward nonce.", 422, "INVALID_AD_NONCE");
  }
  const expected = signAdNonce(payload);
  const valid =
    expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!valid) {
    throw new AppError("Invalid ad reward nonce.", 422, "INVALID_AD_NONCE");
  }
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    userId: string;
    dayKey: string;
    slot: number;
    expiresAt: number;
  };
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
  locale?: StoreLocale;
}) {
  await ensureSeeded();
  const search = filters?.search?.trim();
  const tag = filters?.tag?.trim();
  const rightsType = filters?.rightsType?.toUpperCase() as "ORIGINAL" | "LICENSED" | undefined;

  const characters = await prisma.character.findMany({
    where: {
      publishStatus: "PUBLISHED",
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
    include: characterInclude,
    orderBy: [{ supporterCount: "desc" }, { circulatingUnits: "desc" }],
  });

  return characters.map((character) => toCharacter(character, filters?.locale));
}

export async function getCharacterView(identifier: string, locale?: StoreLocale): Promise<CharacterView> {
  await ensureSeeded();
  const record = await requireCharacter(prisma, identifier);
  const character = toCharacter(record, locale);
  const relatedCharacters = character.relatedCharacterIds.length
    ? await prisma.character.findMany({
        where: { id: { in: character.relatedCharacterIds } },
        include: characterInclude,
      })
    : [];

  const comments = await prisma.comment.findMany({
    where: { characterId: character.id, status: "VISIBLE" },
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
  });

  return {
    character,
    series: toSeries(record.series, locale),
    assets: record.assets.map(toAsset),
    rightsGrants: record.rightsGrants.map(toRightsGrant),
    sourceAttribution: record.sourceAttribution ? toSourceAttribution(record.sourceAttribution) : undefined,
    attributes: (record.attributes as unknown as AttributeWithDefinition[])
      .map((attribute) => ({
        id: attribute.definition.id,
        key: attribute.definition.key,
        label:
          attribute.definition.locales?.find((entry) => entry.locale === dbLocale(locale ?? "en"))?.label ??
          attribute.definition.label,
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
    relatedCharacters: relatedCharacters.map((related) => toCharacter(related, locale)),
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

export async function getShopItems(locale?: StoreLocale) {
  await ensureSeeded();
  return (
    await prisma.shopItem.findMany({
      where: { published: true },
      include: { locales: true },
      orderBy: { price: "asc" },
    })
  ).map((item) => toShopItem(item, locale));
}

export async function buySupport(
  identifier: string,
  quantity: number,
  userId?: string,
  idempotencyKey?: string,
) {
  await ensureSeeded();
  const activeUserId = await getUserId(userId);
  const key = idempotencyKey ?? `buy-${activeUserId}-${identifier}-${Date.now()}-${quantity}`;

  return runIdempotentMutation({
    userId: activeUserId,
    scope: "BUY_SUPPORT",
    key,
    payload: { identifier, quantity },
    operation: async (tx) => {
    const user = await requireUser(tx, activeUserId);
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
      `ledger-${key}`,
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
    await completeMissionEvent(tx, user.id, "SUPPORT_OR_WATCH");
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
    },
  });
}

export async function sellSupport(
  identifier: string,
  quantity: number,
  userId?: string,
  idempotencyKey?: string,
) {
  await ensureSeeded();
  const activeUserId = await getUserId(userId);
  const key = idempotencyKey ?? `sell-${activeUserId}-${identifier}-${Date.now()}-${quantity}`;

  return runIdempotentMutation({
    userId: activeUserId,
    scope: "SELL_SUPPORT",
    key,
    payload: { identifier, quantity },
    operation: async (tx) => {
    const user = await requireUser(tx, activeUserId);
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
      `ledger-${key}`,
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
    },
  });
}

export async function claimDailyReward(userId?: string) {
  await ensureSeeded();

  return withSerializableRetry(async (tx) => {
    const user = await requireUser(tx, userId);
    const wallet = await requireWallet(tx, user.id);
    const dayKey = getHongKongDayKey();
    const existing = await tx.dailyRewardClaim.findUnique({
      where: { userId_dayKey: { userId: user.id, dayKey } },
    });

    if (existing) {
      return {
        claim: { ...existing, claimedAt: existing.claimedAt.toISOString() },
        wallet: toWallet(wallet),
        replayed: true,
      };
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
      replayed: false,
    };
  });
}

export async function claimAdReward(
  userId?: string,
  idempotencyKey?: string,
  requestedSlot?: number,
  proofId?: string,
) {
  await ensureSeeded();
  const activeUserId = await getUserId(userId);
  const dayKey = getHongKongDayKey();
  const existingClaims = await prisma.adRewardClaim.findMany({
    where: { userId: activeUserId, dayKey },
    select: { slot: true },
  });
  const usedSlots = new Set(existingClaims.map((claim) => claim.slot));
  const slot = requestedSlot ?? [1, 2, 3].find((entry) => !usedSlots.has(entry));
  if (!slot || slot < 1 || slot > AD_REWARD_DAILY_LIMIT || usedSlots.has(slot)) {
    throw new AppError("You have reached today's ad reward limit.", 409, "AD_LIMIT_REACHED");
  }
  const key = idempotencyKey ?? `ad-${activeUserId}-${dayKey}-${slot}`;

  return runIdempotentMutation({
    userId: activeUserId,
    scope: "AD_REWARD",
    key,
    payload: { dayKey, slot, proofId },
    operation: async (tx) => {
    const user = await requireUser(tx, activeUserId);
    const wallet = await requireWallet(tx, user.id);
    const count = await tx.adRewardClaim.count({ where: { userId: user.id, dayKey } });

    if (count >= AD_REWARD_DAILY_LIMIT) {
      throw new Error("You have reached today's ad reward limit.");
    }

    const claim = await tx.adRewardClaim.create({
      data: {
        userId: user.id,
        dayKey,
        amount: AD_REWARD,
        slot,
        provider: process.env.ADS_PROVIDER ?? "mock",
        proofId,
      },
    });
    await createLedgerEntry(
      tx,
      wallet,
      AD_REWARD,
      "AD_REWARD",
      dayKey,
      `ledger-${key}`,
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
    },
  });
}

export async function startAdReward(userId?: string) {
  const activeUserId = await getUserId(userId);
  const dayKey = getHongKongDayKey();
  const claims = await prisma.adRewardClaim.findMany({
    where: { userId: activeUserId, dayKey },
    select: { slot: true },
  });
  const used = new Set(claims.map((claim) => claim.slot));
  const slot = [1, 2, 3].find((entry) => !used.has(entry));
  if (!slot) {
    throw new AppError("You have reached today's ad reward limit.", 409, "AD_LIMIT_REACHED");
  }
  const expiresAt = Date.now() + 10 * 60 * 1000;
  return {
    nonce: encodeAdNonce({ userId: activeUserId, dayKey, slot, expiresAt }),
    slot,
    provider: process.env.ADS_PROVIDER ?? "mock",
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export async function completeAdReward(input: {
  nonce: string;
  proofId?: string;
  idempotencyKey?: string;
  userId?: string;
}) {
  const activeUserId = await getUserId(input.userId);
  const nonce = decodeAdNonce(input.nonce);
  if (
    nonce.userId !== activeUserId ||
    nonce.dayKey !== getHongKongDayKey() ||
    nonce.expiresAt < Date.now()
  ) {
    throw new AppError("This ad reward session has expired.", 422, "AD_SESSION_EXPIRED");
  }
  if ((process.env.ADS_PROVIDER ?? "mock") !== "mock" && !input.proofId) {
    throw new AppError("The ad provider did not confirm completion.", 422, "AD_PROOF_REQUIRED");
  }
  return claimAdReward(
    activeUserId,
    input.idempotencyKey ?? `ad-complete-${nonce.dayKey}-${nonce.slot}`,
    nonce.slot,
    input.proofId,
  );
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

  await withSerializableRetry(async (tx) => {
    await tx.watchlistItem.create({ data: { userId: user.id, characterId } });
    await completeMissionEvent(tx, user.id, "SUPPORT_OR_WATCH");
  });
  return { watching: true };
}

export async function addComment(characterId: string, content: string, userId?: string) {
  await ensureSeeded();
  const user = await requireUser(prisma, userId);
  await requireCharacter(prisma, characterId, { tags: true });

  if (content.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comments must stay under ${MAX_COMMENT_LENGTH} characters.`);
  }

  const recentCount = await prisma.comment.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60_000) } },
  });
  if (recentCount >= 3) {
    throw new AppError("Please wait before posting another appreciation note.", 429, "RATE_LIMITED");
  }

  const hostileTerms = ["去死", "垃圾角色", "trash character", "worst girl", "worst boy"];
  const status = hostileTerms.some((term) => content.toLowerCase().includes(term))
    ? "HELD"
    : "VISIBLE";

  const comment = await prisma.comment.create({
    data: { userId: user.id, characterId, content, status },
  });

  return {
    id: comment.id,
    userId: comment.userId,
    characterId: comment.characterId,
    content: comment.content,
    status: comment.status,
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

  await withSerializableRetry(async (tx) => {
    await tx.reaction.create({ data: { userId: user.id, characterId, kind } });
    await completeMissionEvent(tx, user.id, "POSITIVE_REACTION");
  });
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
  const activeUserId = await getUserId(userId);
  const key = idempotencyKey ?? `shop-${activeUserId}-${itemId}-${Date.now()}`;

  return runIdempotentMutation({
    userId: activeUserId,
    scope: "SHOP_PURCHASE",
    key,
    payload: { itemId, equip },
    operation: async (tx) => {
    const user = await requireUser(tx, activeUserId);
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
          `ledger-${key}`,
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
    },
  });
}

export async function createAdminCharacter(
  input: {
    seriesId: string;
    name: string;
    title: string;
    summary: string;
    fandomPrompt: string;
    mood: string;
    zhName: string;
    zhTitle: string;
    zhSummary: string;
    zhFandomPrompt: string;
    zhMood: string;
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
      sourceTitle: "Original ACG Exchange catalog entry",
      rightsType: input.rightsType,
      metadataOnly: input.metadataOnly ?? false,
      basePrice: input.basePrice,
      priceStep: input.priceStep ?? DEFAULT_CHARACTER_PRICE_STEP,
      unitsPerStep: input.unitsPerStep ?? DEFAULT_CHARACTER_UNITS_PER_STEP,
      accentFrom: input.accentFrom,
      accentTo: input.accentTo,
      tags: { connect: input.tags.map((label) => ({ label })) },
      locales: {
        create: [
          {
            locale: "EN",
            name: input.name,
            title: input.title,
            summary: input.summary,
            fandomPrompt: input.fandomPrompt,
            mood: input.mood,
          },
          {
            locale: "ZH_HANT",
            name: input.zhName,
            title: input.zhTitle,
            summary: input.zhSummary,
            fandomPrompt: input.zhFandomPrompt,
            mood: input.zhMood,
          },
        ],
      },
      ...(input.rightsType === "ORIGINAL"
        ? {
            rightsGrants: {
              create: {
                licensor: "ACG Exchange original creator declaration",
                contractReference: `original-${slugify(input.name)}`,
                territories: ["WORLDWIDE"],
                salesChannels: ["WEB"],
                allowedUseTypes: ["DISPLAY", "COSMETIC", "COMFORT_CONTENT"],
                attributionText: "Original ACG Exchange character.",
                takedownContact: process.env.ADMIN_EMAILS?.split(",")[0]?.trim() || "admin@example.com",
                commercialUse: true,
              },
            },
          }
        : {}),
    },
    include: characterInclude,
  });

  return toCharacter(character);
}

const characterWorkflowOrder = ["DRAFT", "RIGHTS_CHECKED", "REVIEWED", "PUBLISHED"] as const;

export async function updateCharacterWorkflow(
  characterId: string,
  nextStatus: "RIGHTS_CHECKED" | "REVIEWED" | "PUBLISHED" | "ARCHIVED",
  userId?: string,
) {
  await requireAdmin(prisma, userId);
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { locales: true, rightsGrants: true, sourceAttribution: true, assets: true, tags: true },
  });
  if (!character) {
    throw new AppError("Character not found.", 404, "CHARACTER_NOT_FOUND");
  }
  if (nextStatus === "ARCHIVED") {
    return toCharacter(
      await prisma.character.update({ where: { id: characterId }, data: { publishStatus: "ARCHIVED" }, include: characterInclude }),
    );
  }
  const currentIndex = characterWorkflowOrder.indexOf(character.publishStatus as (typeof characterWorkflowOrder)[number]);
  const nextIndex = characterWorkflowOrder.indexOf(nextStatus as (typeof characterWorkflowOrder)[number]);
  if (currentIndex < 0 || nextIndex !== currentIndex + 1) {
    throw new AppError(`Character workflow must advance one step from ${character.publishStatus}.`, 409, "INVALID_WORKFLOW_TRANSITION");
  }
  const locales = new Set(character.locales.map((locale) => locale.locale));
  if (!locales.has("EN") || !locales.has("ZH_HANT")) {
    throw new AppError("English and Traditional Chinese content are required.", 422, "LOCALES_INCOMPLETE");
  }
  if (nextStatus === "RIGHTS_CHECKED" && !character.rightsGrants.length && !character.sourceAttribution) {
    throw new AppError("A rights grant or source attribution is required.", 422, "RIGHTS_INCOMPLETE");
  }
  if (
    nextStatus === "PUBLISHED" &&
    !character.metadataOnly &&
    !character.assets.some((asset) => asset.workflowStatus === "PUBLISHED" && ["HERO", "CARD"].includes(asset.kind))
  ) {
    throw new AppError("A published hero or card asset is required.", 422, "MEDIA_INCOMPLETE");
  }
  return toCharacter(
    await prisma.character.update({ where: { id: characterId }, data: { publishStatus: nextStatus }, include: characterInclude }),
  );
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
  if (input.workflowStatus !== "UPLOADED") {
    throw new AppError("New assets must enter the workflow as UPLOADED.", 422, "INVALID_WORKFLOW_ENTRY");
  }
  validateAssetSource(input);

  const asset = await prisma.characterAsset.create({
    data: {
      characterId: input.characterId,
      kind: input.kind,
      label: input.label,
      storageKey: input.storageKey,
      altText: input.altText,
      workflowStatus: input.workflowStatus,
      publishedAt: undefined,
      rightsGrantId: input.rightsGrantId,
      metadata: input.metadata,
      sourceKind: input.sourceKind,
      sourceUrl: input.sourceUrl,
      attributionText: input.attributionText,
      takedownContact: input.takedownContact,
      sourceLabel: input.sourceLabel,
      licenseName: input.licenseName,
      publicUrl: input.publicUrl,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      aiPrompt: input.aiPrompt,
      aiModel: input.aiModel,
    },
  });

  return toAsset(asset);
}

const assetWorkflowOrder: AssetWorkflowStatus[] = [
  "UPLOADED",
  "NORMALIZED",
  "TAGGED",
  "RIGHTS_CHECKED",
  "REVIEWED",
  "PUBLISHED",
];

export async function updateAssetWorkflow(
  assetId: string,
  nextStatus: AssetWorkflowStatus,
  userId?: string,
) {
  await requireAdmin(prisma, userId);
  const asset = await prisma.characterAsset.findUnique({ where: { id: assetId } });
  if (!asset) {
    throw new AppError("Asset not found.", 404, "ASSET_NOT_FOUND");
  }

  if (nextStatus === "PULLED") {
    return toAsset(
      await prisma.characterAsset.update({
        where: { id: assetId },
        data: { workflowStatus: "PULLED", publishedAt: null },
      }),
    );
  }

  const currentIndex = assetWorkflowOrder.indexOf(asset.workflowStatus as AssetWorkflowStatus);
  const nextIndex = assetWorkflowOrder.indexOf(nextStatus);
  if (currentIndex < 0 || nextIndex !== currentIndex + 1) {
    throw new AppError(
      `Asset workflow must advance one step from ${asset.workflowStatus}.`,
      409,
      "INVALID_WORKFLOW_TRANSITION",
    );
  }

  validateAssetSource({
    ...asset,
    workflowStatus: nextStatus,
    rightsGrantId: asset.rightsGrantId ?? undefined,
    sourceUrl: asset.sourceUrl ?? undefined,
    attributionText: asset.attributionText ?? undefined,
    takedownContact: asset.takedownContact ?? undefined,
    sourceLabel: asset.sourceLabel ?? undefined,
    aiPrompt: asset.aiPrompt ?? undefined,
    aiModel: asset.aiModel ?? undefined,
  });
  return toAsset(
    await prisma.characterAsset.update({
      where: { id: assetId },
      data: {
        workflowStatus: nextStatus,
        publishedAt: nextStatus === "PUBLISHED" ? new Date() : null,
      },
    }),
  );
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
  if (asset.workflowStatus !== "PUBLISHED") {
    throw new AppError("Shop items can only use published assets.", 422, "ASSET_NOT_PUBLISHED");
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

  let imported = 0;
  for (const character of sample.characters) {
    const existing = await prisma.character.findUnique({ where: { slug: character.slug } });
    if (existing) {
      continue;
    }
    await importBangumiCharacter(
      {
        seriesTitle: sample.subjectTitle,
        characterName: character.name,
        slug: character.slug,
        summary: character.summary,
        fandomPrompt: character.fandomPrompt,
        tags: character.tags,
        sourceUrl: sample.sourceUrl,
        sourceLabel: `Bangumi subject ${sample.subjectId}`,
      },
      userId,
    );
    imported += 1;
  }

  return {
    sample,
    imported,
  };
}

export async function getAdminSnapshot(userId?: string) {
  await ensureSeeded();
  await requireAdmin(prisma, userId);
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
    characters: characters.map((character) => toCharacter(character)),
    assets: assets.map(toAsset),
    rightsGrants: rightsGrants.map(toRightsGrant),
    reports: reports.map((report) => ({ ...report, createdAt: report.createdAt.toISOString() })),
    shopItems: shopItems.map((item) => toShopItem(item)),
    sourceAttributions: sourceAttributions.map(toSourceAttribution),
  };
}

export async function getPublicSnapshot() {
  const userId = await getOptionalSessionUserId();
  return {
    viewer: userId ? await getCurrentViewer() : null,
    characters: await listCharacters(),
    shopItems: await getShopItems(),
  };
}

export function resetDemoStore() {
  // Retained for older tests; catalog seeding is now explicit and has no request-local cache.
}

export async function getCommentCount(characterId: string) {
  await ensureSeeded();
  return prisma.comment.count({ where: { characterId } });
}

export async function getWatchlistIds(userId?: string) {
  await ensureSeeded();
  const activeUserId = userId ?? (await getOptionalSessionUserId());
  if (!activeUserId) {
    return [];
  }
  const items = await prisma.watchlistItem.findMany({ where: { userId: activeUserId } });
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
  const pinnedCharacters = profile.pinnedCharacterIds.length
    ? await prisma.character.findMany({
        where: { id: { in: profile.pinnedCharacterIds } },
        include: { tags: true },
      })
    : [];
  const milestones = await prisma.supportPosition.findMany({
    where: { userId: profile.userId, units: { gt: 0 } },
    include: { character: { include: { tags: true } } },
    orderBy: { units: "desc" },
    take: 6,
  });

  return {
    user: toUser(user),
    profile: toProfile(profile),
    pinnedCharacters: pinnedCharacters.map((character) => toCharacter(character)),
    positions: profile.holdingsVisibility
      ? milestones.map((position) => ({
          character: toCharacter(position.character),
          units: position.units,
          milestone: position.units >= 100 ? "100+" : position.units >= 50 ? "50+" : position.units >= 10 ? "10+" : "1+",
        }))
      : [],
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

export async function listComfortModes(locale?: StoreLocale) {
  await ensureSeeded();
  return (
    await prisma.comfortMode.findMany({ include: { locales: true }, orderBy: { sortOrder: "asc" } })
  ).map((mode) => toComfortMode(mode, locale));
}

export async function getComfortModeView(slug: string, locale?: StoreLocale): Promise<ComfortModeView> {
  await ensureSeeded();
  const mode = await prisma.comfortMode.findUnique({
    where: { slug },
    include: {
      locales: true,
      contents: {
        where: { published: true },
        include: {
          locales: true,
          comicPanels: { include: { locales: true }, orderBy: { sortOrder: "asc" } },
          character: { include: characterInclude },
        },
        orderBy: { sweetnessLevel: "desc" },
      },
    },
  });

  if (!mode) {
    throw new Error("Comfort mode not found.");
  }

  return {
    ...toComfortMode(mode, locale),
    contents: mode.contents.map((content) => ({
      ...toComfortContent(content, locale),
      comicPanels: content.comicPanels.map((panel) => ({
        id: panel.id,
        sortOrder: panel.sortOrder,
        imageUrl: panel.imageUrl,
        altText: panel.altText,
        caption:
          panel.locales.find((entry) => entry.locale === dbLocale(locale ?? "en"))?.caption ??
          "",
      })),
      character: content.character ? toCharacter(content.character, locale) : undefined,
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

  const session = await withSerializableRetry(async (tx) => {
    const created = await tx.comfortSession.create({
      data: {
        userId: user.id,
        modeSlug: mode.slug,
        characterId: input.characterId,
        note: input.note ?? input.needText,
      },
    });
    await completeMissionEvent(tx, user.id, "COMFORT_SESSION");
    return created;
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

export async function updateProfile(
  input: {
    displayName?: string;
    bio?: string;
    holdingsVisibility?: boolean;
    favoriteTags?: string[];
  },
  userId?: string,
) {
  const user = await requireUser(prisma, userId);
  const profile = await prisma.profile.update({
    where: { userId: user.id },
    data: input,
  });
  return toProfile(profile);
}

export async function updatePinnedCharacters(characterIds: string[], userId?: string) {
  const user = await requireUser(prisma, userId);
  const existing = await prisma.character.count({ where: { id: { in: characterIds } } });
  if (existing !== characterIds.length) {
    throw new AppError("One or more pinned characters do not exist.", 422, "INVALID_PINS");
  }
  const profile = await prisma.profile.update({
    where: { userId: user.id },
    data: { pinnedCharacterIds: characterIds },
  });
  return toProfile(profile);
}

export async function getDailyMissions(userId?: string, locale: "en" | "zh-Hant" = "en") {
  const activeUserId = await getUserId(userId);
  const dayKey = getHongKongDayKey();
  const progress = await prisma.dailyMissionProgress.findMany({
    where: { userId: activeUserId, dayKey },
  });
  const byKey = new Map(progress.map((entry) => [entry.missionKey, entry]));

  return Object.entries(missionDefinitions).map(([key, definition]) => {
    const state = byKey.get(key as keyof typeof missionDefinitions);
    const [title, description] = locale === "zh-Hant" ? definition.zhHant : definition.en;
    return {
      key,
      reward: definition.reward,
      title,
      description,
      completed: Boolean(state?.completedAt),
      claimed: Boolean(state?.claimedAt),
    };
  });
}

export async function claimMissionReward(
  missionKey: keyof typeof missionDefinitions,
  userId?: string,
  idempotencyKey?: string,
) {
  const definition = missionDefinitions[missionKey];
  if (!definition) {
    throw new AppError("Mission not found.", 404, "MISSION_NOT_FOUND");
  }
  const activeUserId = await getUserId(userId);
  const dayKey = getHongKongDayKey();
  const key = idempotencyKey ?? `mission-${activeUserId}-${dayKey}-${missionKey}`;

  return runIdempotentMutation({
    userId: activeUserId,
    scope: "MISSION_REWARD",
    key,
    payload: { missionKey, dayKey },
    operation: async (tx) => {
      const progress = await tx.dailyMissionProgress.findUnique({
        where: { userId_dayKey_missionKey: { userId: activeUserId, dayKey, missionKey } },
      });
      if (!progress?.completedAt) {
        throw new AppError("Complete this mission before claiming it.", 409, "MISSION_INCOMPLETE");
      }
      if (progress.claimedAt) {
        throw new AppError("This mission reward was already claimed.", 409, "MISSION_CLAIMED");
      }
      const wallet = await requireWallet(tx, activeUserId);
      await createLedgerEntry(
        tx,
        wallet,
        definition.reward,
        "MISSION_REWARD",
        `${dayKey}:${missionKey}`,
        `ledger-${key}`,
      );
      const updated = await tx.dailyMissionProgress.update({
        where: { id: progress.id },
        data: { claimedAt: new Date() },
      });
      await createNotification(
        tx,
        activeUserId,
        "Mission reward claimed",
        `You received ${definition.reward} SUP.`,
        "REWARD",
      );
      return { mission: updated, wallet: toWallet(wallet) };
    },
  });
}

export async function getWorkDashboard(userId?: string) {
  const activeUserId = await getUserId(userId);
  const dayKey = getHongKongDayKey();
  await prisma.workShift.updateMany({
    where: { userId: activeUserId, status: "ACTIVE", endsAt: { lte: new Date() } },
    data: { status: "READY" },
  });
  const shifts = await prisma.workShift.findMany({
    where: { userId: activeUserId, dayKey },
    orderBy: { startedAt: "desc" },
  });
  const earnedToday = shifts
    .filter((shift) => shift.status === "CLAIMED")
    .reduce((total, shift) => total + shift.reward, 0);
  return {
    dayKey,
    dailyLimit: DAILY_WORK_REWARD_LIMIT,
    earnedToday,
    options: Object.entries(workDefinitions).map(([kind, value]) => ({ kind, ...value })),
    shifts: shifts.map((shift) => ({
      ...shift,
      startedAt: shift.startedAt.toISOString(),
      endsAt: shift.endsAt.toISOString(),
      claimedAt: shift.claimedAt?.toISOString(),
    })),
  };
}

export async function startWorkShift(
  input: {
    kind: keyof typeof workDefinitions;
    characterId?: string;
    idempotencyKey?: string;
  },
  userId?: string,
) {
  const definition = workDefinitions[input.kind];
  if (!definition) {
    throw new AppError("Work shift not found.", 404, "WORK_NOT_FOUND");
  }
  const activeUserId = await getUserId(userId);
  const dayKey = getHongKongDayKey();
  const key = input.idempotencyKey ?? `work-start-${activeUserId}-${Date.now()}`;

  return runIdempotentMutation({
    userId: activeUserId,
    scope: "WORK_START",
    key,
    payload: { kind: input.kind, characterId: input.characterId, dayKey },
    operation: async (tx) => {
      const active = await tx.workShift.findFirst({
        where: { userId: activeUserId, status: { in: ["ACTIVE", "READY"] } },
      });
      if (active) {
        throw new AppError("Finish the current shift before starting another.", 409, "WORK_ACTIVE");
      }
      if (input.characterId) {
        await requireCharacter(tx, input.characterId, { tags: true });
      }
      const issued = await tx.workShift.aggregate({
        where: { userId: activeUserId, dayKey, status: { not: "CANCELLED" } },
        _sum: { reward: true },
      });
      if ((issued._sum.reward ?? 0) + definition.reward > DAILY_WORK_REWARD_LIMIT) {
        throw new AppError("This shift would exceed today's work reward limit.", 409, "WORK_LIMIT_REACHED");
      }
      const startedAt = new Date();
      const shift = await tx.workShift.create({
        data: {
          userId: activeUserId,
          characterId: input.characterId,
          dayKey,
          kind: input.kind,
          reward: definition.reward,
          startedAt,
          endsAt: new Date(startedAt.getTime() + definition.durationMs),
        },
      });
      return {
        ...shift,
        startedAt: shift.startedAt.toISOString(),
        endsAt: shift.endsAt.toISOString(),
      };
    },
  });
}

export async function claimWorkShift(
  shiftId: string,
  userId?: string,
  idempotencyKey?: string,
) {
  const activeUserId = await getUserId(userId);
  const key = idempotencyKey ?? `work-claim-${activeUserId}-${shiftId}`;
  return runIdempotentMutation({
    userId: activeUserId,
    scope: "WORK_CLAIM",
    key,
    payload: { shiftId },
    operation: async (tx) => {
      const shift = await tx.workShift.findFirst({ where: { id: shiftId, userId: activeUserId } });
      if (!shift) {
        throw new AppError("Work shift not found.", 404, "WORK_NOT_FOUND");
      }
      if (shift.claimedAt || shift.status === "CLAIMED") {
        throw new AppError("This shift was already claimed.", 409, "WORK_CLAIMED");
      }
      if (shift.endsAt > new Date()) {
        throw new AppError("This shift is still in progress.", 409, "WORK_IN_PROGRESS");
      }
      const claimed = await tx.workShift.aggregate({
        where: { userId: activeUserId, dayKey: shift.dayKey, status: "CLAIMED" },
        _sum: { reward: true },
      });
      if ((claimed._sum.reward ?? 0) + shift.reward > DAILY_WORK_REWARD_LIMIT) {
        throw new AppError("Today's work reward limit has been reached.", 409, "WORK_LIMIT_REACHED");
      }
      const wallet = await requireWallet(tx, activeUserId);
      await createLedgerEntry(
        tx,
        wallet,
        shift.reward,
        "WORK_REWARD",
        shift.id,
        `ledger-${key}`,
      );
      const updated = await tx.workShift.update({
        where: { id: shift.id },
        data: { status: "CLAIMED", claimedAt: new Date() },
      });
      await createNotification(
        tx,
        activeUserId,
        "Part-time shift complete",
        `You received ${shift.reward} SUP.`,
        "REWARD",
      );
      return {
        shift: { ...updated, startedAt: updated.startedAt.toISOString(), endsAt: updated.endsAt.toISOString() },
        wallet: toWallet(wallet),
      };
    },
  });
}

export async function getCharacterHistory(identifier: string, limit = 60) {
  const character = await requireCharacter(prisma, identifier, { tags: true });
  const trades = await prisma.trade.findMany({
    where: { characterId: character.id },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 180),
  });
  return trades.reverse().map((trade) => ({
    at: trade.createdAt.toISOString(),
    quote: trade.unitPrice,
    side: trade.side,
    quantity: trade.quantity,
  }));
}

export async function getMarketFeed(limit = 12) {
  const recentTrades = await getRecentTrades(limit);
  const trendingRows = await prisma.trade.groupBy({
    by: ["characterId"],
    where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    _sum: { quantity: true },
    _count: { _all: true },
    orderBy: { _count: { characterId: "desc" } },
    take: 8,
  });
  const characters = await prisma.character.findMany({
    where: { id: { in: trendingRows.map((row) => row.characterId) } },
    include: { tags: true },
  });
  const byId = new Map(characters.map((character) => [character.id, toCharacter(character)]));
  return {
    recentTrades,
    trending: trendingRows.flatMap((row) => {
      const character = byId.get(row.characterId);
      return character
        ? [{ character, activity: row._count._all, units: row._sum.quantity ?? 0 }]
        : [];
    }),
  };
}

export async function getMeDashboard(userId?: string, locale: "en" | "zh-Hant" = "en") {
  const activeUserId = await getUserId(userId);
  const [portfolio, missions, work, ledger] = await Promise.all([
    getPortfolioView(activeUserId),
    getDailyMissions(activeUserId, locale),
    getWorkDashboard(activeUserId),
    prisma.ledgerEntry.findMany({
      where: { wallet: { userId: activeUserId } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return {
    ...portfolio,
    missions,
    work,
    ledger: ledger.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
  };
}
