import { z } from "zod";
import { AppError, NotFoundError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const appealSchema = z.object({ reason: z.string().trim().min(20).max(2000) }).strict();
export const appealDecisionSchema = z.object({ accepted: z.boolean(), note: z.string().trim().min(8).max(2000) }).strict();

export async function submitModerationAppeal(userId: string, reportId: string, reason: string) {
  const input = appealSchema.parse({ reason });
  const report = await prisma.report.findFirst({ where: { id: reportId, status: "RESOLVED", OR: [{ commentId: null, post: { is: { authorId: userId } } }, { comment: { is: { userId } } }] }, select: { id: true } });
  if (!report) throw new NotFoundError("An appealable decision was not found.");
  const id = `appeal:${reportId}:${userId}`;
  const event = await prisma.contributorTrustEvent.upsert({ where: { id }, create: { id, userId, actorUserId: userId, kind: "MODERATION_ACTION", points: 0, referenceId: `appeal:${reportId}`, note: JSON.stringify({ action: "APPEAL_SUBMITTED", reason: input.reason, reportId }) }, update: {} });
  return { id: event.id, submitted: true };
}

export async function listModerationAppeals() {
  const events = await prisma.contributorTrustEvent.findMany({ where: { referenceId: { startsWith: "appeal:" }, actorUserId: { not: null } }, orderBy: { createdAt: "desc" }, take: 200 });
  return events.filter((event) => event.id.startsWith("appeal:") && !event.id.endsWith(":decision")).map((event) => ({ id: event.id, userId: event.userId, reportId: event.referenceId!.slice(7), reason: JSON.parse(event.note ?? "{}").reason as string, createdAt: event.createdAt.toISOString(), decision: events.find((item) => item.id === `${event.id}:decision`)?.note ?? null }));
}

export async function decideModerationAppeal(adminId: string, appealId: string, raw: unknown) {
  const input = appealDecisionSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const appeal = await tx.contributorTrustEvent.findUnique({ where: { id: appealId } });
    if (!appeal?.referenceId?.startsWith("appeal:") || appeal.id.endsWith(":decision")) throw new NotFoundError("Appeal not found.");
    if (appeal.userId === adminId) throw new AppError("An independent administrator must review this appeal.", 403, "INDEPENDENT_REVIEW_REQUIRED");
    if (await tx.contributorTrustEvent.findUnique({ where: { id: `${appeal.id}:decision` } })) throw new AppError("This appeal has already been reviewed.", 409, "APPEAL_CLOSED");
    const reportId = appeal.referenceId.slice(7);
    const report = await tx.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError("Report not found.");
    await tx.contributorTrustEvent.create({ data: { id: `${appeal.id}:decision`, userId: appeal.userId, actorUserId: adminId, kind: "MODERATION_ACTION", points: 0, referenceId: appeal.referenceId, note: JSON.stringify({ action: "APPEAL_DECIDED", ...input, reportId }) } });
    if (input.accepted) {
      await tx.report.update({ where: { id: reportId }, data: { status: "DISMISSED", resolution: JSON.stringify({ originalDecision: report.resolution, appeal: input, reviewerId: adminId }) } });
      if (report.commentId) await tx.comment.updateMany({ where: { id: report.commentId, status: "REMOVED" }, data: { status: "VISIBLE" } });
      else if (report.postId) await tx.post.updateMany({ where: { id: report.postId, status: "REMOVED" }, data: { status: "HELD" } });
      const otherSuspensions = await tx.report.count({ where: { status: "RESOLVED", resolution: { contains: '"decision":"SUSPEND"' }, OR: [{ post: { is: { authorId: appeal.userId } } }, { comment: { is: { userId: appeal.userId } } }] } });
      if (!otherSuspensions) await tx.creatorProfile.updateMany({ where: { userId: appeal.userId, status: "SUSPENDED" }, data: { status: "ACTIVE" } });
    }
    await tx.notification.create({ data: { userId: appeal.userId, type: "SYSTEM", title: input.accepted ? "Appeal accepted" : "Appeal reviewed", body: input.note, href: "/me/moderation", metadata: { reportId, accepted: input.accepted } } });
    return { reviewed: true, accepted: input.accepted };
  }, { isolationLevel: "Serializable" });
}
