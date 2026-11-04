import { randomUUID } from "node:crypto";
import { Prisma, type CreatorSeries } from "@prisma/client";
import { z } from "zod";
import { AppError, AuthenticationError, AuthorizationError, NotFoundError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { classifyRetryablePrismaConflict, waitForSerializableRetry } from "@/lib/prisma-retry";

type Tx = Prisma.TransactionClient;
export const creatorSeriesKinds = ["NOTE", "OUTFIT", "COMIC", "VOICE", "GUIDE", "PREDICTION_TAKE"] as const;
const fields = {
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(3000),
  kind: z.enum(creatorSeriesKinds),
  published: z.boolean(),
  postIds: z.array(z.string().trim().min(1).max(128)).max(100).refine((ids) => new Set(ids).size === ids.length, "Duplicate posts are not allowed."),
};
export const createCreatorSeriesSchema = z.object({
  ...fields,
  description: fields.description.default(""), kind: fields.kind.default("NOTE"),
  published: fields.published.default(false), postIds: fields.postIds.optional(),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100).optional(),
}).strict();
export const updateCreatorSeriesSchema = z.object(fields).partial().strict().refine((value) => Object.keys(value).length > 0, "Provide at least one change.");
export const creatorSeriesSubscriptionSchema = z.object({ subscribed: z.boolean() }).strict();

async function transaction<T>(operation: (tx: Tx) => Promise<T>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
    } catch (error) {
      const conflict = classifyRetryablePrismaConflict(error);
      if (conflict === "WRITE_CONFLICT" && attempt < 3) {
        await waitForSerializableRetry(attempt + 1);
        continue;
      }
      if (conflict === "UNIQUE_CONFLICT") throw new AppError("This series address is already in use.", 409, "SERIES_SLUG_TAKEN");
      if (conflict === "WRITE_CONFLICT") throw new AppError("The series changed. Please retry.", 409, "SERIES_CHANGED");
      throw error;
    }
  }
}

async function requireAccount(tx: Tx, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, creatorProfile: { select: { status: true } } } });
  if (!user) throw new AuthenticationError("Your account is no longer available.");
  return user;
}

function seriesDto(series: CreatorSeries) {
  return {
    id: series.id, slug: series.slug, title: series.title, description: series.description,
    kind: series.kind, published: series.published, creatorId: series.creatorId,
    createdAt: series.createdAt.toISOString(), updatedAt: series.updatedAt.toISOString(),
  };
}

async function assignPosts(tx: Tx, series: CreatorSeries, userId: string, postIds: string[]) {
  const owned = await tx.post.count({ where: { id: { in: postIds }, authorId: userId, status: { not: "REMOVED" } } });
  if (owned !== postIds.length) throw new AuthorizationError("Only your own non-removed posts can be assigned to a series.");
  // Membership changes never bypass moderation or change a post's publication status.
  await tx.post.updateMany({ where: { creatorSeriesId: series.id, authorId: userId, id: { notIn: postIds } }, data: { creatorSeriesId: null } });
  await tx.post.updateMany({ where: { id: { in: postIds }, authorId: userId, status: { not: "REMOVED" } }, data: { creatorSeriesId: series.id } });
}

export async function createCreatorSeries(userId: string, raw: unknown) {
  const input = createCreatorSeriesSchema.parse(raw);
  return transaction(async (tx) => {
    const user = await requireAccount(tx, userId);
    if (user.creatorProfile?.status === "SUSPENDED") throw new AuthorizationError("Publishing is suspended for this account.");
    const { postIds, ...data } = input;
    const slug = input.slug ?? `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "series"}-${randomUUID().slice(0, 8)}`;
    const series = await tx.creatorSeries.create({ data: { ...data, slug, creatorId: userId } });
    if (postIds) await assignPosts(tx, series, userId, postIds);
    return { series: seriesDto(series) };
  });
}

export async function updateCreatorSeries(userId: string, id: string, raw: unknown) {
  const input = updateCreatorSeriesSchema.parse(raw);
  return transaction(async (tx) => {
    const user = await requireAccount(tx, userId);
    const series = await tx.creatorSeries.findFirst({ where: { id, creatorId: userId } });
    if (!series) throw new NotFoundError("Your creator series was not found.");
    if (user.creatorProfile?.status === "SUSPENDED" && input.published !== false) throw new AuthorizationError("Publishing is suspended for this account.");
    const { postIds, ...data } = input;
    const updated = await tx.creatorSeries.update({ where: { id: series.id, creatorId: userId }, data });
    if (postIds) await assignPosts(tx, updated, userId, postIds);
    return { series: seriesDto(updated) };
  });
}

const publicCreator = { creator: { creatorProfile: { isNot: { status: "SUSPENDED" as const } } } };

export async function listCreatorSeries() {
  const records = await prisma.creatorSeries.findMany({
    where: { published: true, ...publicCreator }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 50,
    select: { id: true, slug: true, title: true, description: true, kind: true, creator: { select: { name: true, profile: { select: { handle: true, displayName: true } } } } },
  });
  return { series: records.map(({ creator, ...series }) => ({ ...series, creator: { name: creator.profile?.displayName ?? creator.name ?? "Creator", handle: creator.profile?.handle ?? null } })) };
}

export async function listMyCreatorSeries(userId: string) {
  const records = await prisma.creatorSeries.findMany({
    where: { creatorId: userId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    include: { posts: { where: { authorId: userId, status: { not: "REMOVED" } }, select: { id: true, title: true, status: true, creatorSeriesId: true } }, _count: { select: { subscribers: true } } },
  });
  const posts = await prisma.post.findMany({ where: { authorId: userId, status: { not: "REMOVED" } }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, title: true, status: true, creatorSeriesId: true } });
  const availablePosts = [...new Map([...posts, ...records.flatMap((series) => series.posts)].map((post) => [post.id, post])).values()];
  return { series: records.map((series) => ({ ...seriesDto(series), postIds: series.posts.map((post) => post.id), subscriberCount: series._count.subscribers })), posts: availablePosts };
}

export async function getPublicCreatorSeries(slug: string, viewerId?: string) {
  const series = await prisma.creatorSeries.findFirst({
    where: { slug, published: true, ...publicCreator },
    include: { creator: { select: { name: true, profile: { select: { displayName: true, handle: true } } } } },
  });
  if (!series) throw new NotFoundError("Published creator series not found.");
  const posts = await prisma.post.findMany({
    where: { creatorSeriesId: series.id, authorId: series.creatorId, status: "PUBLISHED", publishedAt: { lte: new Date() } },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }], take: 100,
    select: { id: true, slug: true, title: true, body: true, language: true, kind: true, publishedAt: true },
  });
  const subscription = viewerId ? await prisma.creatorSeriesSubscription.findUnique({ where: { userId_seriesId: { userId: viewerId, seriesId: series.id } }, select: { userId: true } }) : null;
  return {
    series: { ...seriesDto(series), creator: { name: series.creator.profile?.displayName ?? series.creator.name ?? "Creator", handle: series.creator.profile?.handle ?? null } },
    posts: posts.map((post) => ({ ...post, body: post.body.slice(0, 300), language: post.language === "ZH_HANT" ? "zh-Hant" : "en", publishedAt: post.publishedAt!.toISOString() })),
    subscribed: Boolean(subscription), isOwner: viewerId === series.creatorId,
  };
}

export async function setCreatorSeriesSubscription(userId: string, seriesId: string, subscribed: boolean) {
  return transaction(async (tx) => {
    await requireAccount(tx, userId);
    if (!subscribed) {
      await tx.creatorSeriesSubscription.deleteMany({ where: { userId, seriesId } });
      return { subscribed: false };
    }
    const series = await tx.creatorSeries.findFirst({ where: { id: seriesId, published: true, ...publicCreator }, select: { id: true, creatorId: true } });
    if (!series) throw new NotFoundError("Published creator series not found.");
    if (series.creatorId === userId) throw new AppError("You already manage this series.", 422, "OWN_SERIES");
    await tx.creatorSeriesSubscription.upsert({ where: { userId_seriesId: { userId, seriesId } }, create: { userId, seriesId }, update: {} });
    return { subscribed: true };
  });
}

