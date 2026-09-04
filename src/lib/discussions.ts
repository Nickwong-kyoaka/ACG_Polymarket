import { AppError, AuthorizationError, NotFoundError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export interface DiscussionTarget {
  characterId?: string;
  postId?: string;
  predictionMarketId?: string;
}

function targetWhere(target: DiscussionTarget) {
  return {
    characterId: target.characterId ?? null,
    postId: target.postId ?? null,
    predictionMarketId: target.predictionMarketId ?? null,
  };
}

async function validateTarget(target: DiscussionTarget) {
  const chosen = [target.characterId, target.postId, target.predictionMarketId].filter(Boolean);
  if (chosen.length !== 1) throw new AppError("Choose exactly one discussion target.", 422, "INVALID_COMMENT_TARGET");
  if (target.characterId) {
    const character = await prisma.character.findFirst({ where: { id: target.characterId, publishStatus: "PUBLISHED" }, select: { id: true } });
    if (!character) throw new NotFoundError("Character discussion not found.");
  }
  if (target.postId) {
    const post = await prisma.post.findFirst({ where: { OR: [{ id: target.postId }, { slug: target.postId }], status: "PUBLISHED" }, select: { id: true } });
    if (!post) throw new NotFoundError("Post discussion not found.");
    target.postId = post.id;
  }
  if (target.predictionMarketId) {
    const market = await prisma.predictionMarket.findFirst({ where: { OR: [{ id: target.predictionMarketId }, { slug: target.predictionMarketId }], status: { not: "DRAFT" } }, select: { id: true } });
    if (!market) throw new NotFoundError("Prediction discussion not found.");
    target.predictionMarketId = market.id;
  }
}

export async function createDiscussionComment(input: DiscussionTarget & { parentId?: string; content: string }, userId: string) {
  const target: DiscussionTarget = { characterId: input.characterId, postId: input.postId, predictionMarketId: input.predictionMarketId };
  await validateTarget(target);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, profile: { select: { displayName: true, handle: true } } } });
  if (!user) throw new AppError("Sign in to join the discussion.", 401, "UNAUTHENTICATED");

  if (input.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: input.parentId }, select: { id: true, characterId: true, postId: true, predictionMarketId: true } });
    if (!parent || parent.characterId !== (target.characterId ?? null) || parent.postId !== (target.postId ?? null) || parent.predictionMarketId !== (target.predictionMarketId ?? null)) {
      throw new AppError("The reply belongs to a different discussion.", 422, "INVALID_REPLY_TARGET");
    }
  }

  const minuteAgo = new Date(Date.now() - 60_000);
  const slowModeCutoff = new Date(Date.now() - 15_000);
  const [recentCount, recentOnTarget] = await Promise.all([
    prisma.comment.count({ where: { userId, createdAt: { gte: minuteAgo } } }),
    prisma.comment.findFirst({ where: { userId, ...targetWhere(target), createdAt: { gte: slowModeCutoff } }, select: { id: true } }),
  ]);
  if (recentCount >= 3 || recentOnTarget) throw new AppError("Give the conversation a moment before adding another note.", 429, "SLOW_MODE");

  const hostileTerms = ["去死", "垃圾角色", "trash character", "worst girl", "worst boy"];
  const normalized = input.content.trim();
  const status = hostileTerms.some((term) => normalized.toLowerCase().includes(term)) ? "HELD" : "VISIBLE";
  const comment = await prisma.comment.create({ data: { userId, ...targetWhere(target), parentId: input.parentId, content: normalized, status } });
  return {
    id: comment.id,
    content: comment.content,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
    parentId: comment.parentId,
    author: { displayName: user.profile?.displayName ?? user.name ?? "Supporter", handle: user.profile?.handle ?? "supporter" },
  };
}

export async function markCommentByPostAuthor(commentId: string, action: "PIN" | "HEART", userId: string) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId }, include: { post: { select: { authorId: true } } } });
  if (!comment) throw new NotFoundError("Comment not found.");
  if (!comment.post || comment.post.authorId !== userId) throw new AuthorizationError("Only the post author can mark this comment.");
  return prisma.comment.update({
    where: { id: commentId },
    data: action === "PIN" ? { pinnedByAuthor: !comment.pinnedByAuthor } : { heartedByAuthor: !comment.heartedByAuthor },
    select: { id: true, pinnedByAuthor: true, heartedByAuthor: true },
  });
}
