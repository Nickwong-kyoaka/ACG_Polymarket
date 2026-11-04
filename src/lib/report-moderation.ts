import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError, ConflictError, NotFoundError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const reportDecisionSchema = z.object({
  decision: z.enum(["REMOVE", "DISMISS", "WARN", "SUSPEND"]),
  note: z.string().trim().min(8).max(2000),
}).strict();
export type ReportDecisionInput = z.infer<typeof reportDecisionSchema>;

const reportContext = {
  post: { select: { id: true, slug: true, title: true, body: true, authorId: true, status: true, language: true } },
  comment: { select: { id: true, content: true, userId: true, postId: true, characterId: true, status: true } },
  character: { select: { id: true, slug: true, name: true, publishStatus: true } },
} satisfies Prisma.ReportInclude;

export async function listModerationReports(status?: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED") {
  const reports = await prisma.report.findMany({
    where: status ? { status } : {}, include: reportContext,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "asc" }], take: 200,
  });
  return reports.map((report) => ({ ...report, createdAt: report.createdAt.toISOString() }));
}

export async function decideReport(adminUserId: string, reportId: string, rawInput: ReportDecisionInput) {
  const input = reportDecisionSchema.parse(rawInput);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const report = await tx.report.findUnique({ where: { id: reportId }, include: reportContext });
        if (!report) throw new NotFoundError("Report not found.");
        if (report.status === "RESOLVED" || report.status === "DISMISSED") {
          let previous: Partial<ReportDecisionInput> = {};
          try { previous = JSON.parse(report.resolution ?? "{}"); } catch { /* Legacy notes are not replayable decisions. */ }
          if (previous.decision === input.decision && previous.note === input.note) {
            return { report: { ...report, createdAt: report.createdAt.toISOString() }, replayed: true };
          }
          throw new ConflictError("This report already has a final decision.", "REPORT_CLOSED");
        }

        // commentId is the target; postId/characterId can be its context.
        const creatorId = report.comment?.userId ?? (!report.commentId ? report.post?.authorId : undefined);
        if ((input.decision === "WARN" || input.decision === "SUSPEND") && !creatorId) {
          throw new AppError("This report has no creator to warn or suspend.", 422, "REPORT_CREATOR_MISSING");
        }
        const status = input.decision === "DISMISS" ? "DISMISSED" : "RESOLVED";
        const resolution = JSON.stringify({ ...input, actorUserId: adminUserId, decidedAt: new Date().toISOString() });
        const claimed = await tx.report.updateMany({
          where: { id: reportId, status: { in: ["OPEN", "REVIEWING"] } }, data: { status, resolution },
        });
        if (claimed.count !== 1) throw new ConflictError("This report was decided by another moderator.", "REPORT_CLOSED");

        if (input.decision === "REMOVE" || input.decision === "SUSPEND") {
          if (report.comment) {
            await tx.comment.update({ where: { id: report.comment.id }, data: { status: "REMOVED" } });
          } else if (!report.commentId && report.post) {
            await tx.post.update({ where: { id: report.post.id }, data: { status: "REMOVED", publishedAt: null } });
          } else if (!report.commentId && !report.postId && report.character) {
            await tx.character.update({ where: { id: report.character.id }, data: { publishStatus: "DRAFT" } });
            await tx.characterAsset.updateMany({ where: { characterId: report.character.id }, data: { workflowStatus: "PULLED", publishedAt: null } });
            await tx.postMedia.updateMany({ where: { asset: { is: { characterId: report.character.id } } }, data: { status: "PULLED" } });
          } else {
            throw new AppError("The reported target no longer exists.", 409, "REPORT_TARGET_MISSING");
          }
        }
        if (input.decision === "SUSPEND" && creatorId) {
          await tx.creatorProfile.upsert({ where: { userId: creatorId }, create: { userId: creatorId, status: "SUSPENDED" }, update: { status: "SUSPENDED" } });
        }
        await tx.contributorTrustEvent.create({ data: {
          userId: creatorId ?? report.userId, actorUserId: adminUserId, kind: "MODERATION_ACTION",
          points: { DISMISS: 0, WARN: -1, REMOVE: -3, SUSPEND: -10 }[input.decision],
          referenceId: report.id, note: resolution,
        } });
        await tx.notification.create({ data: {
          userId: report.userId, type: "SYSTEM", title: "Report reviewed",
          body: input.decision === "DISMISS" ? "Your report was reviewed and dismissed." : "Your report was reviewed and moderation action was taken.",
          href: "/me/notifications", metadata: { reportId, decision: input.decision },
        } });
        if (creatorId && input.decision !== "DISMISS") {
          await tx.notification.create({ data: {
            userId: creatorId, type: "SYSTEM", title: { REMOVE: "Content removed", WARN: "Community warning", SUSPEND: "Creator publishing suspended" }[input.decision],
            body: input.note, href: report.postId && !report.commentId ? `/${report.post?.language === "ZH_HANT" ? "zh-Hant" : "en"}/me/posts?post=${encodeURIComponent(report.postId)}` : "/me/notifications",
            metadata: { reportId, decision: input.decision, postId: report.postId, commentId: report.commentId },
          } });
        }
        return { report: { ...report, status, resolution, createdAt: report.createdAt.toISOString() }, replayed: false };
      }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new ConflictError("The report could not be safely decided.");
}
