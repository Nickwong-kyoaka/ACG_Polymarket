import { z } from "zod";
import { apiOk, AppError, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["REVIEWING", "RESOLVED", "DISMISSED"]),
  resolutionNotes: z.string().trim().min(8).max(2_000),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminUserId = await requireAdminSessionUserId();
    const [{ id }, payload] = await Promise.all([
      params,
      parseJson(request).then((value) => schema.parse(value)),
    ]);
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.takedownRequest.findUnique({ where: { id } });
      if (!current) throw new AppError("Takedown request not found.", 404, "TAKEDOWN_NOT_FOUND");
      if (["RESOLVED", "DISMISSED"].includes(current.status)) {
        throw new AppError("This takedown request is already closed.", 409, "TAKEDOWN_CLOSED");
      }
      if (payload.status === "RESOLVED") {
        await tx.characterAsset.update({
          where: { id: current.assetId },
          data: { workflowStatus: "PULLED", permissionStatus: "TAKEDOWN_REQUESTED", publishedAt: null },
        });
      }
      const takedown = await tx.takedownRequest.update({
        where: { id },
        data: payload,
        select: { id: true, assetId: true, status: true, resolutionNotes: true, updatedAt: true },
      });
      await tx.assetAuditLog.create({
        data: {
          assetId: current.assetId,
          actorUserId: adminUserId,
          action: payload.status === "RESOLVED" ? "TAKEDOWN_RESOLVED" : "METADATA_UPDATED",
          detail: { requestId: id, status: payload.status, resolutionNotes: payload.resolutionNotes },
        },
      });
      return takedown;
    });
    return apiOk({ takedown: { ...result, updatedAt: result.updatedAt.toISOString() } });
  } catch (error) {
    return handleApiError(error);
  }
}
