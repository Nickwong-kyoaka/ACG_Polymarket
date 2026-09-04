import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";
import { z } from "zod";

import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const socialLocales = ["en", "zh-Hant"] as const;
export const feedModes = ["for-you", "following", "seasonal"] as const;
export const positivePostReactions = ["LIKE", "LOVE", "CHEER", "COMFORT", "INSIGHTFUL"] as const;

export type SocialLocale = (typeof socialLocales)[number];
export type FeedMode = (typeof feedModes)[number];
export type PositivePostReaction = (typeof positivePostReactions)[number];

type DbLocale = "EN" | "ZH_HANT";
type TransactionClient = Prisma.TransactionClient;

const idSchema = z.string().trim().min(1).max(191);
const httpsUrlSchema = z
  .url()
  .max(2_048)
  .refine((value) => value.startsWith("https://"), "URL must use HTTPS.");
const storageKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, "storageKey contains unsupported characters.")
  .refine((value) => !value.includes("..") && !value.startsWith("/"), "storageKey is invalid.");

export const feedQuerySchema = z
  .object({
    mode: z.enum(feedModes).default("for-you"),
    locale: z.enum(socialLocales).default("en"),
    cursor: z.string().trim().min(1).max(512).optional(),
    limit: z.coerce.number().int().min(1).max(40).default(20),
  })
  .strict();

export const postDetailQuerySchema = z
  .object({ locale: z.enum(socialLocales).default("en") })
  .strict();

const postMediaInputSchema = z
  .object({
    assetId: idSchema.optional(),
    publicUrl: httpsUrlSchema.optional(),
    storageKey: storageKeySchema.optional(),
    sourceUrl: httpsUrlSchema.optional(),
    sourceLabel: z.string().trim().min(1).max(120).optional(),
    altText: z.string().trim().min(1).max(240).optional(),
  })
  .strict()
  .superRefine((media, context) => {
    const referencesAsset = Boolean(media.assetId);
    const suppliesNewMedia = Boolean(media.publicUrl || media.storageKey);

    if (referencesAsset === suppliesNewMedia) {
      context.addIssue({
        code: "custom",
        message: "Each media item must reference one published asset or provide one new upload/external URL.",
      });
    }
    if (referencesAsset && (media.sourceUrl || media.sourceLabel)) {
      context.addIssue({
        code: "custom",
        message: "Source fields are inherited when assetId is provided.",
      });
    }
    if (suppliesNewMedia && !media.altText) {
      context.addIssue({ code: "custom", message: "altText is required for new media." });
    }
    if (suppliesNewMedia && !media.sourceUrl) {
      context.addIssue({
        code: "custom",
        message: "sourceUrl is required for new media.",
      });
    }
    if (suppliesNewMedia && !media.sourceLabel) {
      context.addIssue({
        code: "custom",
        message: "sourceLabel is required for new media.",
      });
    }
  });

export const createPostInputSchema = z
  .object({
    language: z.enum(socialLocales),
    kind: z.enum(["NOTE", "OUTFIT", "COMIC", "VOICE", "GUIDE", "PREDICTION_TAKE"]).default("NOTE"),
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(10_000),
    primaryCharacterId: idSchema.optional(),
    seriesId: idSchema.optional(),
    creatorSeriesId: idSchema.optional(),
    topicIds: z
      .array(idSchema)
      .max(5)
      .default([])
      .refine((items) => new Set(items).size === items.length, "topicIds must be unique."),
    sourceUrl: httpsUrlSchema.optional(),
    aiGenerated: z.boolean().default(false),
    media: z.array(postMediaInputSchema).max(9).default([]),
  })
  .strict();

export const postReactionInputSchema = z
  .object({ kind: z.enum(positivePostReactions) })
  .strict();

export const followInputSchema = z
  .object({
    targetType: z.enum(["user", "character", "topic"]),
    targetId: idSchema,
  })
  .strict();

const collectionItemInputSchema = z
  .object({
    postId: idSchema.optional(),
    characterId: idSchema.optional(),
    assetId: idSchema.optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine(
    (item) => [item.postId, item.characterId, item.assetId].filter(Boolean).length === 1,
    "Each collection item must contain exactly one postId, characterId, or assetId.",
  );

export const createCollectionInputSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().max(1_000).default(""),
    isPublic: z.boolean().default(true),
    items: z
      .array(collectionItemInputSchema)
      .max(50)
      .default([])
      .refine((items) => {
        const keys = items.map((item) => item.postId ?? item.characterId ?? item.assetId);
        return new Set(keys).size === keys.length;
      }, "Collection items must be unique."),
  })
  .strict();

const booleanQuerySchema = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return value;
}, z.boolean().optional());

export const collectionListQuerySchema = z
  .object({
    locale: z.enum(socialLocales).default("en"),
    cursor: z.string().trim().min(1).max(512).optional(),
    limit: z.coerce.number().int().min(1).max(40).default(20),
    owner: z.string().trim().min(1).max(191).optional(),
    mine: booleanQuerySchema.default(false),
  })
  .strict()
  .refine((input) => !(input.mine && input.owner), "owner and mine cannot be combined.");

export type CreatePostInput = z.infer<typeof createPostInputSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionInputSchema>;
export type FollowInput = z.infer<typeof followInputSchema>;

interface CursorPayload {
  version: 1;
  at: string;
  id: string;
}

export function encodeSocialCursor(at: Date | string, id: string) {
  const value = typeof at === "string" ? new Date(at) : at;
  if (Number.isNaN(value.getTime()) || !id) {
    throw new AppError("Cannot encode an invalid cursor.", 500, "INVALID_CURSOR_STATE");
  }
  const payload: CursorPayload = { version: 1, at: value.toISOString(), id };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeSocialCursor(cursor: string): { at: Date; id: string } {
  try {
    const payload = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CursorPayload;
    const at = new Date(payload.at);
    if (payload.version !== 1 || !payload.id || Number.isNaN(at.getTime())) throw new Error();
    return { at, id: payload.id };
  } catch {
    throw new AppError("The pagination cursor is invalid or expired.", 422, "INVALID_CURSOR");
  }
}

function dbLocale(locale: SocialLocale): DbLocale {
  return locale === "zh-Hant" ? "ZH_HANT" : "EN";
}

function makeSlug(title: string) {
  const stem = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52);
  return `${stem || "note"}-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function isRetryableTransactionError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "P2034" || error.code === "40001"),
  );
}

async function serializable<T>(operation: (tx: TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: "Serializable" });
    } catch (error) {
      if (!isRetryableTransactionError(error)) throw error;
      if (attempt === 2) {
        throw new ConflictError(
          "This action conflicted with another update. Please retry.",
          "TRANSACTION_CONFLICT",
        );
      }
    }
  }
  throw new AppError("Transaction retry limit reached.", 409, "TRANSACTION_CONFLICT");
}

export interface ReviewDecisionInput {
  approvedPostCount: number;
  probationComplete: boolean;
  hasNewMedia: boolean;
}

export function decidePostReview(input: ReviewDecisionInput) {
  if (input.hasNewMedia) {
    return { status: "PENDING_REVIEW" as const, reason: "NEW_MEDIA_REVIEW" as const };
  }
  if (!input.probationComplete && input.approvedPostCount < 3) {
    return { status: "PENDING_REVIEW" as const, reason: "CREATOR_PROBATION" as const };
  }
  return { status: "PUBLISHED" as const, reason: null };
}

interface FeedSignals {
  followedUserIds: Set<string>;
  followedCharacterIds: Set<string>;
  followedTopicIds: Set<string>;
}

export interface FeedRankingCandidate {
  id: string;
  authorId: string;
  primaryCharacterId: string | null;
  seriesId: string | null;
  topicIds: string[];
  publishedAt: Date | string;
  saveCount: number;
  reactionCount: number;
  commentCount: number;
  seasonal: boolean;
  hasSource: boolean;
}

export interface FeedRankingContext {
  mode: FeedMode;
  locale: SocialLocale;
  now: Date;
  followedUserIds?: ReadonlySet<string>;
  followedCharacterIds?: ReadonlySet<string>;
  followedTopicIds?: ReadonlySet<string>;
}

interface RankingReason {
  code: string;
  label: string;
  weight: number;
}

const reasonLabels = {
  en: {
    FOLLOWED_CREATOR: "From a creator you follow",
    FOLLOWED_CHARACTER: "Features a character you follow",
    FOLLOWED_TOPIC: "Matches a topic you follow",
    SEASONAL: "Connected to this season",
    FRESH: "Recently published",
    SAVED: "Saved by fans",
    DISCUSSED: "Active fan discussion",
    REACTED: "Warm community response",
    SOURCED: "Includes a source",
  },
  "zh-Hant": {
    FOLLOWED_CREATOR: "來自你關注的創作者",
    FOLLOWED_CHARACTER: "有你關注的角色",
    FOLLOWED_TOPIC: "符合你關注的話題",
    SEASONAL: "與本季作品相關",
    FRESH: "最近發布",
    SAVED: "受到粉絲收藏",
    DISCUSSED: "正在熱烈交流",
    REACTED: "收到溫暖回應",
    SOURCED: "附有內容來源",
  },
} as const;

function freshnessWeight(publishedAt: Date | string, now: Date) {
  const ageHours = Math.max(0, now.getTime() - new Date(publishedAt).getTime()) / 3_600_000;
  if (ageHours <= 6) return 28;
  if (ageHours <= 24) return 22;
  if (ageHours <= 72) return 16;
  if (ageHours <= 168) return 10;
  if (ageHours <= 720) return 4;
  return 0;
}

function baseRanking(candidate: FeedRankingCandidate, context: FeedRankingContext) {
  const reasons: RankingReason[] = [];
  const add = (code: keyof (typeof reasonLabels)["en"], weight: number) => {
    if (weight <= 0) return;
    reasons.push({ code, label: reasonLabels[context.locale][code], weight });
  };

  if (context.followedUserIds?.has(candidate.authorId)) add("FOLLOWED_CREATOR", 36);
  if (
    candidate.primaryCharacterId &&
    context.followedCharacterIds?.has(candidate.primaryCharacterId)
  ) {
    add("FOLLOWED_CHARACTER", 28);
  }
  const followedTopicCount = candidate.topicIds.filter((id) => context.followedTopicIds?.has(id)).length;
  add("FOLLOWED_TOPIC", Math.min(followedTopicCount * 16, 32));
  if (candidate.seasonal) add("SEASONAL", context.mode === "seasonal" ? 32 : 12);
  add("FRESH", freshnessWeight(candidate.publishedAt, context.now));
  add("SAVED", Math.min(candidate.saveCount * 3, 24));
  add("DISCUSSED", Math.min(candidate.commentCount * 2, 18));
  add("REACTED", Math.min(candidate.reactionCount * 2, 16));
  if (candidate.hasSource) add("SOURCED", 3);

  return {
    score: reasons.reduce((sum, reason) => sum + reason.weight, 0),
    reasons: reasons.sort((left, right) => right.weight - left.weight).slice(0, 4),
  };
}

export function rankFeedCandidates(
  candidates: FeedRankingCandidate[],
  context: FeedRankingContext,
) {
  const remaining = candidates.map((candidate) => ({
    candidate,
    ...baseRanking(candidate, context),
  }));
  const ranked: Array<(typeof remaining)[number]> = [];
  const authorCounts = new Map<string, number>();
  const seriesCounts = new Map<string, number>();

  while (remaining.length) {
    remaining.sort((left, right) => {
      const leftPenalty =
        (authorCounts.get(left.candidate.authorId) ?? 0) * 18 +
        (left.candidate.seriesId ? (seriesCounts.get(left.candidate.seriesId) ?? 0) * 8 : 0);
      const rightPenalty =
        (authorCounts.get(right.candidate.authorId) ?? 0) * 18 +
        (right.candidate.seriesId ? (seriesCounts.get(right.candidate.seriesId) ?? 0) * 8 : 0);
      const scoreDifference = right.score - rightPenalty - (left.score - leftPenalty);
      if (scoreDifference) return scoreDifference;
      const dateDifference =
        new Date(right.candidate.publishedAt).getTime() -
        new Date(left.candidate.publishedAt).getTime();
      return dateDifference || left.candidate.id.localeCompare(right.candidate.id);
    });
    const selected = remaining.shift();
    if (!selected) break;
    ranked.push(selected);
    authorCounts.set(selected.candidate.authorId, (authorCounts.get(selected.candidate.authorId) ?? 0) + 1);
    if (selected.candidate.seriesId) {
      seriesCounts.set(
        selected.candidate.seriesId,
        (seriesCounts.get(selected.candidate.seriesId) ?? 0) + 1,
      );
    }
  }

  return ranked;
}

function publicPostSelect(locale: DbLocale, viewerId?: string) {
  const anonymousViewer = viewerId ?? "__anonymous__";
  return {
    id: true,
    authorId: true,
    slug: true,
    language: true,
    kind: true,
    title: true,
    body: true,
    primaryCharacterId: true,
    seriesId: true,
    sourceUrl: true,
    aiGenerated: true,
    viewCount: true,
    publishedAt: true,
    createdAt: true,
    author: {
      select: {
        id: true,
        name: true,
        image: true,
        profile: { select: { handle: true, displayName: true } },
        creatorProfile: { select: { tagline: true } },
      },
    },
    primaryCharacter: {
      select: {
        id: true,
        slug: true,
        name: true,
        title: true,
        releaseSeason: true,
        accentFrom: true,
        accentTo: true,
        locales: {
          where: { locale },
          take: 1,
          select: { name: true, title: true },
        },
      },
    },
    series: {
      select: {
        id: true,
        slug: true,
        title: true,
        locales: { where: { locale }, take: 1, select: { title: true } },
        episodes: {
          where: {
            airAt: {
              gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1_000),
              lte: new Date(Date.now() + 120 * 24 * 60 * 60 * 1_000),
            },
          },
          take: 1,
          select: { id: true },
        },
      },
    },
    creatorSeries: {
      select: { id: true, slug: true, title: true, kind: true },
    },
    topics: {
      select: {
        topic: {
          select: {
            id: true,
            slug: true,
            title: true,
            featured: true,
            locales: { where: { locale }, take: 1, select: { title: true } },
          },
        },
      },
    },
    media: {
      where: {
        status: "APPROVED" as const,
        OR: [
          {
            assetId: null,
            OR: [
              { publicUrl: { startsWith: "https://" } },
              { storageKey: { startsWith: "assets/" } },
            ],
          },
          {
            asset: {
              is: {
                workflowStatus: "PUBLISHED" as const,
                contentRating: "SFW" as const,
                permissionStatus: { notIn: ["REJECTED", "TAKEDOWN_REQUESTED"] as const },
              },
            },
          },
        ],
      },
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      select: {
        id: true,
        assetId: true,
        publicUrl: true,
        storageKey: true,
        sourceUrl: true,
        sourceLabel: true,
        altText: true,
        sortOrder: true,
        asset: {
          select: {
            id: true,
            publicUrl: true,
            storageKey: true,
            altText: true,
            sourceLabel: true,
            sourceUrl: true,
            creatorName: true,
            creatorUrl: true,
            licenseName: true,
            licenseUrl: true,
            permissionStatus: true,
            sourceKind: true,
            locales: {
              where: { locale },
              take: 1,
              select: { altText: true, caption: true },
            },
            derivatives: {
              orderBy: { kind: "asc" as const },
              select: { kind: true, publicUrl: true, width: true, height: true },
            },
          },
        },
      },
    },
    saves: {
      where: { userId: anonymousViewer },
      take: 1,
      select: { userId: true },
    },
    reactions: {
      where: { userId: anonymousViewer, kind: { in: [...positivePostReactions] } },
      select: { kind: true },
    },
    _count: {
      select: {
        saves: true,
        reactions: { where: { kind: { in: [...positivePostReactions] } } },
        comments: { where: { status: "VISIBLE" as const } },
      },
    },
  } satisfies Prisma.PostSelect;
}

type PublicPostRecord = Prisma.PostGetPayload<{
  select: ReturnType<typeof publicPostSelect>;
}>;

interface RenderableAsset {
  publicUrl: string | null;
  storageKey: string;
  derivatives: Array<{
    kind: string;
    publicUrl: string;
    width: number;
    height: number;
  }>;
}

function renderedAssetUrl(asset: RenderableAsset) {
  const preferred =
    asset.derivatives.find((item) => item.kind === "CARD") ??
    asset.derivatives.find((item) => item.kind === "THUMBNAIL") ??
    asset.derivatives[0];
  if (preferred) {
    return { url: preferred.publicUrl, width: preferred.width, height: preferred.height };
  }
  if (asset.publicUrl?.startsWith("https://")) {
    return { url: asset.publicUrl, width: null, height: null };
  }
  if (asset.storageKey.startsWith("assets/")) {
    return { url: `/${asset.storageKey}`, width: null, height: null };
  }
  return null;
}

function publicMedia(media: PublicPostRecord["media"][number]) {
  const assetMedia = media.asset ? renderedAssetUrl(media.asset) : null;
  const directUrl = media.publicUrl?.startsWith("https://") ? media.publicUrl : null;
  const localUrl = media.storageKey?.startsWith("assets/") ? `/${media.storageKey}` : null;
  const rendered = assetMedia ?? (directUrl || localUrl ? { url: directUrl ?? localUrl!, width: null, height: null } : null);
  if (!rendered) return null;
  const localizedAsset = media.asset?.locales[0];
  return {
    id: media.id,
    url: rendered.url,
    width: rendered.width,
    height: rendered.height,
    altText: media.altText || localizedAsset?.altText || media.asset?.altText || "",
    caption: localizedAsset?.caption ?? null,
    sourceLabel: media.sourceLabel ?? media.asset?.sourceLabel ?? media.asset?.sourceKind.replaceAll("_", " ") ?? null,
    sourceUrl: media.sourceUrl ?? media.asset?.sourceUrl ?? null,
    creatorName: media.asset?.creatorName ?? null,
    creatorUrl: media.asset?.creatorUrl ?? null,
    licenseName: media.asset?.licenseName ?? null,
    licenseUrl: media.asset?.licenseUrl ?? null,
    permissionBadge: media.asset?.permissionStatus ?? "APPROVED",
  };
}

function isSeasonal(record: PublicPostRecord, year: number) {
  return Boolean(
    record.series?.episodes.length ||
      record.primaryCharacter?.releaseSeason?.includes(String(year)) ||
      record.topics.some(({ topic }) => topic.featured),
  );
}

function toRankingCandidate(record: PublicPostRecord, year: number): FeedRankingCandidate {
  return {
    id: record.id,
    authorId: record.authorId,
    primaryCharacterId: record.primaryCharacterId,
    seriesId: record.seriesId,
    topicIds: record.topics.map(({ topic }) => topic.id),
    publishedAt: record.publishedAt ?? record.createdAt,
    saveCount: record._count.saves,
    reactionCount: record._count.reactions,
    commentCount: record._count.comments,
    seasonal: isSeasonal(record, year),
    hasSource: Boolean(record.sourceUrl),
  };
}

function publicPostDto(record: PublicPostRecord, locale: SocialLocale, signals?: FeedSignals) {
  const characterLocale = record.primaryCharacter?.locales[0];
  const seriesLocale = record.series?.locales[0];
  const counts = {
    saves: record._count.saves,
    reactions: record._count.reactions,
    comments: record._count.comments,
  };
  return {
    id: record.id,
    slug: record.slug,
    language: record.language === "ZH_HANT" ? "zh-Hant" : "en",
    kind: record.kind,
    title: record.title,
    body: record.body,
    sourceUrl: record.sourceUrl,
    aiGenerated: record.aiGenerated,
    publishedAt: (record.publishedAt ?? record.createdAt).toISOString(),
    author: {
      id: record.author.id,
      handle: record.author.profile?.handle ?? null,
      displayName: record.author.profile?.displayName ?? record.author.name ?? (locale === "zh-Hant" ? "同好" : "Fan"),
      image: record.author.image,
      tagline: record.author.creatorProfile?.tagline ?? null,
    },
    primaryCharacter: record.primaryCharacter
      ? {
          id: record.primaryCharacter.id,
          slug: record.primaryCharacter.slug,
          name: characterLocale?.name ?? record.primaryCharacter.name,
          title: characterLocale?.title ?? record.primaryCharacter.title,
          accentFrom: record.primaryCharacter.accentFrom,
          accentTo: record.primaryCharacter.accentTo,
        }
      : null,
    series: record.series
      ? {
          id: record.series.id,
          slug: record.series.slug,
          title: seriesLocale?.title ?? record.series.title,
        }
      : null,
    creatorSeries: record.creatorSeries,
    topics: record.topics.map(({ topic }) => ({
      id: topic.id,
      slug: topic.slug,
      title: topic.locales[0]?.title ?? topic.title,
    })),
    media: record.media.flatMap((entry) => {
      const dto = publicMedia(entry);
      return dto ? [dto] : [];
    }),
    counts,
    engagement: counts,
    viewer: {
      saved: record.saves.length > 0,
      reactions: record.reactions.map((reaction) => reaction.kind),
      followingAuthor: signals?.followedUserIds.has(record.authorId) ?? false,
      followingCharacter:
        (record.primaryCharacterId &&
          signals?.followedCharacterIds.has(record.primaryCharacterId)) ||
        false,
    },
  };
}

async function loadFeedSignals(userId?: string): Promise<FeedSignals> {
  if (!userId) {
    return {
      followedUserIds: new Set(),
      followedCharacterIds: new Set(),
      followedTopicIds: new Set(),
    };
  }
  const [users, characters, topics] = await Promise.all([
    prisma.userFollow.findMany({ where: { followerId: userId }, select: { targetId: true } }),
    prisma.characterFollow.findMany({ where: { userId }, select: { characterId: true } }),
    prisma.topicFollow.findMany({ where: { userId }, select: { topicId: true } }),
  ]);
  return {
    followedUserIds: new Set(users.map((entry) => entry.targetId)),
    followedCharacterIds: new Set(characters.map((entry) => entry.characterId)),
    followedTopicIds: new Set(topics.map((entry) => entry.topicId)),
  };
}

export async function getSocialFeed(input: {
  mode?: FeedMode;
  locale?: SocialLocale;
  cursor?: string;
  limit?: number;
  viewerId?: string;
  now?: Date;
}) {
  const mode = input.mode ?? "for-you";
  const locale = input.locale ?? "en";
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 40);
  const now = input.now ?? new Date();
  const signals = await loadFeedSignals(input.viewerId);
  const cursor = input.cursor ? decodeSocialCursor(input.cursor) : null;

  if (
    mode === "following" &&
    !signals.followedUserIds.size &&
    !signals.followedCharacterIds.size &&
    !signals.followedTopicIds.size
  ) {
    return {
      mode,
      locale,
      items: [],
      nextCursor: null,
      generatedAt: now.toISOString(),
      rankingVersion: "social-v1",
      emptyReason: input.viewerId ? "NO_FOLLOWS" : "SIGN_IN_TO_FOLLOW",
    };
  }

  const year = now.getUTCFullYear();
  const seasonStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1_000);
  const seasonEnd = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1_000);
  const modeWhere: Prisma.PostWhereInput =
    mode === "following"
      ? {
          OR: [
            ...(signals.followedUserIds.size
              ? [{ authorId: { in: [...signals.followedUserIds] } }]
              : []),
            ...(signals.followedCharacterIds.size
              ? [{ primaryCharacterId: { in: [...signals.followedCharacterIds] } }]
              : []),
            ...(signals.followedTopicIds.size
              ? [{ topics: { some: { topicId: { in: [...signals.followedTopicIds] } } } }]
              : []),
          ],
        }
      : mode === "seasonal"
        ? {
            OR: [
              { primaryCharacter: { is: { releaseSeason: { contains: String(year) } } } },
              { series: { is: { episodes: { some: { airAt: { gte: seasonStart, lte: seasonEnd } } } } } },
              { topics: { some: { topic: { featured: true } } } },
            ],
          }
        : {};
  const cursorWhere: Prisma.PostWhereInput = cursor
    ? {
        OR: [
          { publishedAt: { lt: cursor.at } },
          { publishedAt: cursor.at, id: { lt: cursor.id } },
        ],
      }
    : {};

  const records = await prisma.post.findMany({
    where: {
      AND: [
        { status: "PUBLISHED", language: dbLocale(locale), publishedAt: { not: null } },
        modeWhere,
        cursorWhere,
      ],
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: publicPostSelect(dbLocale(locale), input.viewerId),
  });
  const hasMore = records.length > limit;
  const chronologicalPage = records.slice(0, limit);
  const ranked = rankFeedCandidates(
    chronologicalPage.map((record) => toRankingCandidate(record, year)),
    {
      mode,
      locale,
      now,
      followedUserIds: signals.followedUserIds,
      followedCharacterIds: signals.followedCharacterIds,
      followedTopicIds: signals.followedTopicIds,
    },
  );
  const recordById = new Map(chronologicalPage.map((record) => [record.id, record]));
  const boundary = chronologicalPage.at(-1);

  return {
    mode,
    locale,
    items: ranked.flatMap((entry) => {
      const record = recordById.get(entry.candidate.id);
      return record
        ? [
            {
              ...publicPostDto(record, locale, signals),
              recommendationReason: entry.reasons[0]?.label ?? null,
              ranking: { score: entry.score, reasons: entry.reasons },
            },
          ]
        : [];
    }),
    nextCursor:
      hasMore && boundary
        ? encodeSocialCursor(boundary.publishedAt ?? boundary.createdAt, boundary.id)
        : null,
    generatedAt: now.toISOString(),
    rankingVersion: "social-v1",
    emptyReason: null,
  };
}

export async function getPublicPost(
  identifier: string,
  locale: SocialLocale = "en",
  viewerId?: string,
) {
  const [post, signals] = await Promise.all([
    prisma.post.findFirst({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
        OR: [{ id: identifier }, { slug: identifier }],
      },
      select: publicPostSelect(dbLocale(locale), viewerId),
    }),
    loadFeedSignals(viewerId),
  ]);
  if (!post) throw new NotFoundError("Published post not found.");
  return { post: publicPostDto(post, locale, signals) };
}

async function validatePostReferences(
  tx: TransactionClient,
  input: CreatePostInput,
  userId: string,
) {
  const assetIds = input.media.flatMap((media) => (media.assetId ? [media.assetId] : []));
  const [user, character, series, creatorSeries, topics, assets] = await Promise.all([
    tx.user.findUnique({
      where: { id: userId },
      select: { id: true },
    }),
    input.primaryCharacterId
      ? tx.character.findFirst({
          where: { id: input.primaryCharacterId, publishStatus: "PUBLISHED" },
          select: { id: true, seriesId: true },
        })
      : null,
    input.seriesId
      ? tx.series.findUnique({ where: { id: input.seriesId }, select: { id: true } })
      : null,
    input.creatorSeriesId
      ? tx.creatorSeries.findFirst({
          where: { id: input.creatorSeriesId, creatorId: userId },
          select: { id: true },
        })
      : null,
    input.topicIds.length
      ? tx.topic.findMany({ where: { id: { in: input.topicIds } }, select: { id: true } })
      : [],
    assetIds.length
      ? tx.characterAsset.findMany({
          where: {
            id: { in: assetIds },
            workflowStatus: "PUBLISHED",
            contentRating: "SFW",
            permissionStatus: { notIn: ["REJECTED", "TAKEDOWN_REQUESTED"] },
            OR: [
              { publicUrl: { startsWith: "https://" } },
              { storageKey: { startsWith: "assets/" } },
              { derivatives: { some: { publicUrl: { startsWith: "https://" } } } },
            ],
          },
          select: { id: true, altText: true },
        })
      : [],
  ]);

  if (!user) throw new AuthenticationError("Your user account is no longer available.");
  if (input.primaryCharacterId && !character) {
    throw new NotFoundError("Published character not found.");
  }
  if (input.seriesId && !series) throw new NotFoundError("Series not found.");
  if (character && input.seriesId && character.seriesId !== input.seriesId) {
    throw new AppError("primaryCharacterId does not belong to seriesId.", 422, "INVALID_RELATION");
  }
  if (input.creatorSeriesId && !creatorSeries) {
    throw new NotFoundError("Creator series not found.");
  }
  if (topics.length !== input.topicIds.length) throw new NotFoundError("One or more topics were not found.");
  if (assets.length !== assetIds.length) {
    throw new AppError(
      "Every assetId must reference a published, SFW character asset.",
      422,
      "MEDIA_NOT_PUBLISHABLE",
    );
  }

  const creatorProfile = await tx.creatorProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { status: true, approvedPostCount: true, probationComplete: true },
  });
  if (creatorProfile.status === "SUSPENDED") {
    throw new AuthorizationError("Posting is suspended for this account.");
  }
  return { creatorProfile, assetAltText: new Map(assets.map((asset) => [asset.id, asset.altText])) };
}

export async function createPost(userId: string, rawInput: CreatePostInput) {
  const input = createPostInputSchema.parse(rawInput);
  return serializable(async (tx) => {
    const references = await validatePostReferences(tx, input, userId);
    const hasNewMedia = input.media.some((media) => !media.assetId);
    const review = decidePostReview({
      approvedPostCount: references.creatorProfile.approvedPostCount,
      probationComplete: references.creatorProfile.probationComplete,
      hasNewMedia,
    });
    const now = new Date();
    const post = await tx.post.create({
      data: {
        authorId: userId,
        slug: makeSlug(input.title),
        language: dbLocale(input.language),
        kind: input.kind,
        status: review.status,
        title: input.title,
        body: input.body,
        primaryCharacterId: input.primaryCharacterId,
        seriesId: input.seriesId,
        creatorSeriesId: input.creatorSeriesId,
        sourceUrl: input.sourceUrl,
        aiGenerated: input.aiGenerated,
        publishedAt: review.status === "PUBLISHED" ? now : null,
        topics: input.topicIds.length
          ? { create: input.topicIds.map((topicId) => ({ topicId })) }
          : undefined,
        media: input.media.length
          ? {
              create: input.media.map((media, index) => ({
                assetId: media.assetId,
                publicUrl: media.publicUrl,
                storageKey: media.storageKey,
                sourceUrl: media.sourceUrl,
                sourceLabel: media.sourceLabel,
                altText:
                  media.altText ??
                  (media.assetId ? references.assetAltText.get(media.assetId) : undefined) ??
                  "",
                status: media.assetId ? "APPROVED" : "PENDING_REVIEW",
                sortOrder: index,
                reviewedAt: media.assetId ? now : null,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        slug: true,
        language: true,
        kind: true,
        status: true,
        title: true,
        publishedAt: true,
        createdAt: true,
        _count: { select: { media: true, topics: true } },
      },
    });

    return {
      post: {
        ...post,
        language: post.language === "ZH_HANT" ? "zh-Hant" : "en",
        publishedAt: post.publishedAt?.toISOString() ?? null,
        createdAt: post.createdAt.toISOString(),
      },
      moderation: {
        requiresReview: review.status === "PENDING_REVIEW",
        reason: review.reason,
        approvedPostCount: references.creatorProfile.approvedPostCount,
        probationTarget: 3,
      },
    };
  });
}

async function requirePublishedPost(tx: TransactionClient, postId: string) {
  const post = await tx.post.findFirst({
    where: {
      OR: [{ id: postId }, { slug: postId }],
      status: "PUBLISHED",
      publishedAt: { not: null },
    },
    select: { id: true },
  });
  if (!post) throw new NotFoundError("Published post not found.");
  return post.id;
}

async function updatePostSave(userId: string, identifier: string, desired?: boolean) {
  return serializable(async (tx) => {
    const postId = await requirePublishedPost(tx, identifier);
    const where = { userId_postId: { userId, postId } };
    const existing = await tx.postSave.findUnique({ where, select: { userId: true } });
    const saved = desired ?? !existing;
    if (existing && !saved) await tx.postSave.delete({ where });
    if (!existing && saved) await tx.postSave.create({ data: { userId, postId } });
    const saveCount = await tx.postSave.count({ where: { postId } });
    return { postId, saved, saveCount };
  });
}

export function togglePostSave(userId: string, identifier: string) {
  return updatePostSave(userId, identifier);
}

export function setPostSave(userId: string, identifier: string, saved: boolean) {
  return updatePostSave(userId, identifier, saved);
}

export async function togglePostReaction(
  userId: string,
  identifier: string,
  kind: PositivePostReaction,
) {
  if (!positivePostReactions.includes(kind)) {
    throw new AppError("Unsupported reaction.", 422, "INVALID_REACTION");
  }
  return serializable(async (tx) => {
    const postId = await requirePublishedPost(tx, identifier);
    const where = { userId_postId_kind: { userId, postId, kind } };
    const existing = await tx.postReaction.findUnique({ where, select: { userId: true } });
    if (existing) await tx.postReaction.delete({ where });
    else await tx.postReaction.create({ data: { userId, postId, kind } });
    const reactionCount = await tx.postReaction.count({ where: { postId } });
    return { postId, kind, reacted: !existing, reactionCount };
  });
}

export async function toggleFollow(userId: string, rawInput: FollowInput) {
  const input = followInputSchema.parse(rawInput);
  if (input.targetType === "user" && input.targetId === userId) {
    throw new ConflictError("You cannot follow your own profile.", "SELF_FOLLOW");
  }

  return serializable(async (tx) => {
    if (input.targetType === "user") {
      const target = await tx.user.findUnique({ where: { id: input.targetId }, select: { id: true } });
      if (!target) throw new NotFoundError("User not found.");
      const where = { followerId_targetId: { followerId: userId, targetId: input.targetId } };
      const existing = await tx.userFollow.findUnique({ where, select: { followerId: true } });
      if (existing) await tx.userFollow.delete({ where });
      else await tx.userFollow.create({ data: { followerId: userId, targetId: input.targetId } });
      const followerCount = await tx.userFollow.count({ where: { targetId: input.targetId } });
      return { targetType: input.targetType, targetId: input.targetId, following: !existing, followerCount };
    }

    if (input.targetType === "character") {
      const target = await tx.character.findFirst({
        where: { id: input.targetId, publishStatus: "PUBLISHED" },
        select: { id: true },
      });
      if (!target) throw new NotFoundError("Published character not found.");
      const where = { userId_characterId: { userId, characterId: input.targetId } };
      const existing = await tx.characterFollow.findUnique({ where, select: { userId: true } });
      if (existing) await tx.characterFollow.delete({ where });
      else await tx.characterFollow.create({ data: { userId, characterId: input.targetId } });
      const followerCount = await tx.characterFollow.count({ where: { characterId: input.targetId } });
      return { targetType: input.targetType, targetId: input.targetId, following: !existing, followerCount };
    }

    const target = await tx.topic.findUnique({ where: { id: input.targetId }, select: { id: true } });
    if (!target) throw new NotFoundError("Topic not found.");
    const where = { userId_topicId: { userId, topicId: input.targetId } };
    const existing = await tx.topicFollow.findUnique({ where, select: { userId: true } });
    if (existing) await tx.topicFollow.delete({ where });
    else await tx.topicFollow.create({ data: { userId, topicId: input.targetId } });
    const followerCount = await tx.topicFollow.count({ where: { topicId: input.targetId } });
    return { targetType: input.targetType, targetId: input.targetId, following: !existing, followerCount };
  });
}

const publicCollectionItemWhere: Prisma.CollectionItemWhereInput = {
  OR: [
    { post: { is: { status: "PUBLISHED", publishedAt: { not: null } } } },
    { character: { is: { publishStatus: "PUBLISHED" } } },
    {
      asset: {
        is: {
          workflowStatus: "PUBLISHED",
          contentRating: "SFW",
          permissionStatus: { notIn: ["REJECTED", "TAKEDOWN_REQUESTED"] },
          OR: [
            { publicUrl: { startsWith: "https://" } },
            { storageKey: { startsWith: "assets/" } },
            { derivatives: { some: { publicUrl: { startsWith: "https://" } } } },
          ],
        },
      },
    },
  ],
};

function publicCollectionSelect(locale: DbLocale) {
  return {
    id: true,
    slug: true,
    title: true,
    description: true,
    isPublic: true,
    createdAt: true,
    updatedAt: true,
    user: {
      select: {
        id: true,
        name: true,
        image: true,
        profile: { select: { handle: true, displayName: true } },
      },
    },
    items: {
      where: publicCollectionItemWhere,
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      take: 6,
      select: {
        id: true,
        note: true,
        sortOrder: true,
        post: {
          select: { id: true, slug: true, title: true, language: true, status: true },
        },
        character: {
          select: {
            id: true,
            slug: true,
            name: true,
            title: true,
            locales: { where: { locale }, take: 1, select: { name: true, title: true } },
          },
        },
        asset: {
          select: {
            id: true,
            publicUrl: true,
            storageKey: true,
            altText: true,
            sourceLabel: true,
            sourceUrl: true,
            permissionStatus: true,
            locales: { where: { locale }, take: 1, select: { altText: true } },
            derivatives: {
              orderBy: { kind: "asc" as const },
              select: { kind: true, publicUrl: true, width: true, height: true },
            },
          },
        },
      },
    },
    _count: { select: { items: { where: publicCollectionItemWhere } } },
  } satisfies Prisma.CollectionSelect;
}

type PublicCollectionRecord = Prisma.CollectionGetPayload<{
  select: ReturnType<typeof publicCollectionSelect>;
}>;

function publicCollectionDto(record: PublicCollectionRecord, locale: SocialLocale) {
  const previewItems: Array<
    | {
        id: string;
        type: "post";
        note: string | null;
        post: { id: string; slug: string; title: string; language: SocialLocale };
      }
    | {
        id: string;
        type: "character";
        note: string | null;
        character: { id: string; slug: string; name: string; title: string };
      }
    | {
        id: string;
        type: "asset";
        note: string | null;
        asset: {
          id: string;
          url: string;
          width: number | null;
          height: number | null;
          altText: string;
          sourceLabel: string | null;
          sourceUrl: string | null;
          permissionBadge: string;
        };
      }
  > = [];

  for (const item of record.items) {
    if (item.post?.status === "PUBLISHED") {
      previewItems.push({
        id: item.id,
        type: "post",
        note: item.note,
        post: {
          id: item.post.id,
          slug: item.post.slug,
          title: item.post.title,
          language: item.post.language === "ZH_HANT" ? "zh-Hant" : "en",
        },
      });
      continue;
    }
    if (item.character) {
      const localized = item.character.locales[0];
      previewItems.push({
        id: item.id,
        type: "character",
        note: item.note,
        character: {
          id: item.character.id,
          slug: item.character.slug,
          name: localized?.name ?? item.character.name,
          title: localized?.title ?? item.character.title,
        },
      });
      continue;
    }
    if (item.asset) {
      const media = renderedAssetUrl(item.asset);
      if (media) {
        previewItems.push({
          id: item.id,
          type: "asset",
          note: item.note,
          asset: {
            id: item.asset.id,
            ...media,
            altText: item.asset.locales[0]?.altText ?? item.asset.altText,
            sourceLabel: item.asset.sourceLabel,
            sourceUrl: item.asset.sourceUrl,
            permissionBadge: item.asset.permissionStatus,
          },
        });
      }
    }
  }

  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    description: record.description,
    isPublic: record.isPublic,
    itemCount: record._count.items,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    owner: {
      id: record.user.id,
      handle: record.user.profile?.handle ?? null,
      displayName: record.user.profile?.displayName ?? record.user.name ?? (locale === "zh-Hant" ? "同好" : "Fan"),
      image: record.user.image,
    },
    previewItems,
  };
}

async function validateCollectionItems(tx: TransactionClient, items: CreateCollectionInput["items"]) {
  const postIds = items.flatMap((item) => (item.postId ? [item.postId] : []));
  const characterIds = items.flatMap((item) => (item.characterId ? [item.characterId] : []));
  const assetIds = items.flatMap((item) => (item.assetId ? [item.assetId] : []));
  const [posts, characters, assets] = await Promise.all([
    postIds.length
      ? tx.post.findMany({
          where: { id: { in: postIds }, status: "PUBLISHED", publishedAt: { not: null } },
          select: { id: true },
        })
      : [],
    characterIds.length
      ? tx.character.findMany({ where: { id: { in: characterIds }, publishStatus: "PUBLISHED" }, select: { id: true } })
      : [],
    assetIds.length
      ? tx.characterAsset.findMany({
          where: {
            id: { in: assetIds },
            workflowStatus: "PUBLISHED",
            contentRating: "SFW",
            permissionStatus: { notIn: ["REJECTED", "TAKEDOWN_REQUESTED"] },
            OR: [
              { publicUrl: { startsWith: "https://" } },
              { storageKey: { startsWith: "assets/" } },
              { derivatives: { some: { publicUrl: { startsWith: "https://" } } } },
            ],
          },
          select: { id: true },
        })
      : [],
  ]);
  if (
    posts.length !== postIds.length ||
    characters.length !== characterIds.length ||
    assets.length !== assetIds.length
  ) {
    throw new NotFoundError("One or more collection items are unavailable.");
  }
}

export async function createCollection(userId: string, rawInput: CreateCollectionInput) {
  const input = createCollectionInputSchema.parse(rawInput);
  const collectionId = await serializable(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new AuthenticationError("Your user account is no longer available.");
    await validateCollectionItems(tx, input.items);
    const collection = await tx.collection.create({
      data: {
        userId,
        slug: makeSlug(input.title),
        title: input.title,
        description: input.description,
        isPublic: input.isPublic,
        items: input.items.length
          ? {
              create: input.items.map((item, index) => ({
                postId: item.postId,
                characterId: item.characterId,
                assetId: item.assetId,
                note: item.note,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      select: { id: true },
    });
    return collection.id;
  });
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: publicCollectionSelect(dbLocale("en")),
  });
  if (!collection) throw new ConflictError("Collection was created but could not be loaded.");
  return { collection: publicCollectionDto(collection, "en") };
}

export async function listCollections(input: {
  locale?: SocialLocale;
  cursor?: string;
  limit?: number;
  owner?: string;
  mine?: boolean;
  viewerId?: string;
}) {
  const locale = input.locale ?? "en";
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 40);
  if (input.mine && !input.viewerId) throw new AuthenticationError();
  const cursor = input.cursor ? decodeSocialCursor(input.cursor) : null;
  const visibilityWhere: Prisma.CollectionWhereInput = input.mine
    ? { userId: input.viewerId }
    : { isPublic: true };
  const ownerWhere: Prisma.CollectionWhereInput = input.owner
    ? {
        user: {
          is: {
            OR: [{ id: input.owner }, { profile: { is: { handle: input.owner } } }],
          },
        },
      }
    : {};
  const cursorWhere: Prisma.CollectionWhereInput = cursor
    ? {
        OR: [
          { updatedAt: { lt: cursor.at } },
          { updatedAt: cursor.at, id: { lt: cursor.id } },
        ],
      }
    : {};
  const records = await prisma.collection.findMany({
    where: { AND: [visibilityWhere, ownerWhere, cursorWhere] },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: publicCollectionSelect(dbLocale(locale)),
  });
  const hasMore = records.length > limit;
  const page = records.slice(0, limit);
  const boundary = page.at(-1);
  return {
    items: page.map((record) => publicCollectionDto(record, locale)),
    nextCursor:
      hasMore && boundary ? encodeSocialCursor(boundary.updatedAt, boundary.id) : null,
  };
}
