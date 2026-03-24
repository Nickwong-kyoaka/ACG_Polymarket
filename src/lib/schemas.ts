import { z } from "zod";

export const tradeSchema = z.object({
  quantity: z.number().int().min(1).max(25),
  userId: z.string().optional(),
});

export const commentSchema = z.object({
  characterId: z.string().min(1),
  content: z.string().trim().min(3).max(280),
  userId: z.string().optional(),
});

export const reactionSchema = z.object({
  characterId: z.string().min(1),
  kind: z.enum(["CHEER", "HEART", "HYPE"]),
  userId: z.string().optional(),
});

export const reportSchema = z.object({
  characterId: z.string().optional(),
  commentId: z.string().optional(),
  reason: z.string().trim().min(3).max(120),
  detail: z.string().trim().max(500).optional(),
  userId: z.string().optional(),
});

export const watchlistSchema = z.object({
  characterId: z.string().min(1),
  userId: z.string().optional(),
});

export const shopPurchaseSchema = z.object({
  itemId: z.string().min(1),
  userId: z.string().optional(),
  equip: z.boolean().optional(),
});

export const adminCharacterSchema = z.object({
  seriesId: z.string().min(1),
  name: z.string().min(2),
  title: z.string().min(2),
  summary: z.string().min(20),
  fandomPrompt: z.string().min(10),
  mood: z.string().min(2),
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
  kind: z.enum(["HERO", "CARD", "THUMB", "WALLPAPER", "AVATAR_FRAME", "PROFILE_THEME"]),
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
});

export const adminShopItemSchema = z.object({
  collectionId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().min(10),
  kind: z.enum(["WALLPAPER", "AVATAR_FRAME", "PROFILE_THEME"]),
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
