import { z } from "zod";

export const tradeSchema = z.object({
  quantity: z.number().int().min(1).max(25),
  idempotencyKey: z.string().min(8).max(160).optional(),
});

export const commentSchema = z.object({
  characterId: z.string().min(1),
  content: z.string().trim().min(3).max(280),
});

export const reactionSchema = z.object({
  characterId: z.string().min(1),
  kind: z.enum(["CHEER", "HEART", "HYPE"]),
});

export const reportSchema = z.object({
  characterId: z.string().optional(),
  commentId: z.string().optional(),
  reason: z.string().trim().min(3).max(120),
  detail: z.string().trim().max(500).optional(),
});

export const watchlistSchema = z.object({
  characterId: z.string().min(1),
});

export const shopPurchaseSchema = z.object({
  itemId: z.string().min(1),
  equip: z.boolean().optional(),
  idempotencyKey: z.string().min(8).max(160).optional(),
});

export const adminCharacterSchema = z.object({
  seriesId: z.string().min(1),
  name: z.string().min(2),
  title: z.string().min(2),
  summary: z.string().min(20),
  fandomPrompt: z.string().min(10),
  mood: z.string().min(2),
  zhName: z.string().min(2),
  zhTitle: z.string().min(2),
  zhSummary: z.string().min(10),
  zhFandomPrompt: z.string().min(6),
  zhMood: z.string().min(1),
  rightsType: z.enum(["ORIGINAL", "LICENSED"]),
  metadataOnly: z.boolean().optional(),
  basePrice: z.number().int().min(1),
  priceStep: z.number().int().min(1).max(20).optional(),
  unitsPerStep: z.number().int().min(10).max(500).optional(),
  tags: z.array(z.string()).min(1),
  accentFrom: z.string().regex(/^#/),
  accentTo: z.string().regex(/^#/),
});

export const adminAssetSchema = z.object({
  characterId: z.string().optional(),
  kind: z.enum([
    "HERO",
    "CARD",
    "THUMB",
    "WALLPAPER",
    "AVATAR_FRAME",
    "PROFILE_THEME",
    "VOICE",
    "ASMR",
    "COMIC",
  ]),
  label: z.string().min(2),
  storageKey: z.string().min(2),
  altText: z.string().min(8),
  workflowStatus: z.enum([
    "UPLOADED",
    "NORMALIZED",
    "TAGGED",
    "RIGHTS_CHECKED",
    "REVIEWED",
    "PUBLISHED",
    "PULLED",
  ]),
  rightsGrantId: z.string().optional(),
  sourceKind: z
    .enum(["AI_GENERATED", "USER_PROVIDED", "BANGUMI_METADATA", "OFFICIAL_REFERENCE"])
    .optional(),
  sourceUrl: z.string().url().optional(),
  attributionText: z.string().min(3).optional(),
  takedownContact: z.string().min(3).optional(),
  sourceLabel: z.string().min(2).optional(),
  licenseName: z.string().min(2).optional(),
  publicUrl: z.string().url().optional(),
  mimeType: z.string().min(3).optional(),
  byteSize: z.number().int().positive().optional(),
  aiPrompt: z.string().min(3).optional(),
  aiModel: z.string().min(2).optional(),
});

export const adminShopItemSchema = z.object({
  collectionId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().min(10),
  kind: z.enum(["WALLPAPER", "AVATAR_FRAME", "PROFILE_THEME", "VOICE", "ASMR", "COMIC"]),
  currencyType: z.enum(["SOFT", "PREMIUM"]),
  price: z.number().int().min(1),
  previewLabel: z.string().min(2),
  assetId: z.string().min(1),
});

export const bangumiImportSchema = z.object({
  seriesTitle: z.string().min(2),
  characterName: z.string().min(2),
  slug: z.string().min(2),
  summary: z.string().min(10),
  fandomPrompt: z.string().min(10),
  tags: z.array(z.string()).min(1),
  sourceUrl: z.string().url(),
  sourceLabel: z.string().min(2),
  importedText: z.string().optional(),
  licenseName: z.string().optional(),
  attributionText: z.string().optional(),
  originalAuthor: z.string().optional(),
});

export const bangumiSubjectImportSchema = z.object({
  subjectId: z.string().min(1),
});

export const comfortSessionSchema = z.object({
  modeSlug: z.string().min(1).optional(),
  needText: z.string().trim().max(500).optional(),
  characterId: z.string().optional(),
  note: z.string().trim().max(500).optional(),
});

export const comfortReactionSchema = z.object({
  modeSlug: z.string().min(1),
  contentId: z.string().optional(),
  kind: z.enum(["SOOTHED", "SWEET", "REPLAY"]),
});

export const adminComfortContentSchema = z.object({
  modeSlug: z.string().min(1),
  characterId: z.string().optional(),
  kind: z.enum(["SWEET_TALK", "ASMR", "VOICE", "COMIC", "WALLPAPER"]),
  title: z.string().min(2),
  body: z.string().min(10),
  mediaUrl: z.string().optional(),
  sweetnessLevel: z.number().int().min(1).max(100).optional(),
  unlockShopItemId: z.string().optional(),
  published: z.boolean().optional(),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(40).optional(),
  bio: z.string().trim().max(280).optional(),
  holdingsVisibility: z.boolean().optional(),
  favoriteTags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
});

export const profilePinsSchema = z.object({
  characterIds: z.array(z.string().min(1)).max(6),
});

export const missionClaimSchema = z.object({
  idempotencyKey: z.string().min(8).max(160).optional(),
});

export const workStartSchema = z.object({
  kind: z.enum(["SHIFT_30M", "SHIFT_2H", "SHIFT_6H"]),
  characterId: z.string().optional(),
  idempotencyKey: z.string().min(8).max(160).optional(),
});

export const workClaimSchema = z.object({
  idempotencyKey: z.string().min(8).max(160).optional(),
});

export const adCompleteSchema = z.object({
  nonce: z.string().min(16),
  proofId: z.string().optional(),
  idempotencyKey: z.string().min(8).max(160).optional(),
});

export const assetWorkflowSchema = z.object({
  workflowStatus: z.enum([
    "UPLOADED",
    "NORMALIZED",
    "TAGGED",
    "RIGHTS_CHECKED",
    "REVIEWED",
    "PUBLISHED",
    "PULLED",
  ]),
});

export const characterWorkflowSchema = z.object({
  publishStatus: z.enum(["RIGHTS_CHECKED", "REVIEWED", "PUBLISHED", "ARCHIVED"]),
});

export const uploadPresignSchema = z.object({
  filename: z.string().min(1).max(180),
  contentType: z.string().min(3).max(120),
  byteSize: z.number().int().positive().max(25 * 1024 * 1024),
});
