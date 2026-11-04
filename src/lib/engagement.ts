import type { Prisma } from "@prisma/client";

export async function recordMemberActivity(tx: Prisma.TransactionClient, userId: string, name: string, referenceId: string) {
  await tx.analyticsEvent.create({ data: { userId, name, metadata: { referenceId } } });
}

export async function notifyPostFollowers(tx: Prisma.TransactionClient, post: { id: string; authorId: string; title: string; slug: string; primaryCharacterId: string | null; creatorSeriesId: string | null }) {
  const followers = await tx.user.findMany({ where: { id: { not: post.authorId }, AND: [
    { OR: [{ followingUsers: { some: { targetId: post.authorId } } },
      ...(post.primaryCharacterId ? [{ characterFollows: { some: { characterId: post.primaryCharacterId } } }] : []),
      ...(post.creatorSeriesId ? [{ creatorSubscriptions: { some: { seriesId: post.creatorSeriesId } } }] : []),
    ] },
    { OR: [{ notificationPreference: { is: null } }, { notificationPreference: { is: { followedContent: true } } }] },
  ] }, select: { id: true, profile: { select: { preferredLocale: true } } } });
  for (const member of followers) {
    const zh = member.profile?.preferredLocale === "ZH_HANT";
    await tx.notification.upsert({ where: { id: `post-update:${post.id}:${member.id}` }, create: {
      id: `post-update:${post.id}:${member.id}`, userId: member.id, type: "SOCIAL", locale: zh ? "ZH_HANT" : "EN",
      title: zh ? "書架上有一篇新筆記" : "A new note reached your shelf", body: post.title,
      href: `/posts/${post.slug}`, metadata: { postId: post.id },
    }, update: {} });
  }
}
