import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { assetWorkflowSchema } from "@/lib/schemas";
import { updateAssetWorkflow } from "@/lib/store";
import { prisma } from "@/lib/prisma";
import { pullLinkedPostMedia } from "@/lib/post-media";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = assetWorkflowSchema.parse(await parseJson(request));
    const adminId = await requireAdminSessionUserId();
    if (payload.workflowStatus === "PULLED") {
      const asset = await prisma.$transaction(async (tx) => {
        const asset = await tx.characterAsset.update({ where: { id }, data: { workflowStatus: "PULLED", publishedAt: null, auditLogs: { create: { actorUserId: adminId, action: "PULLED" } } } });
        await pullLinkedPostMedia(tx, id);
        return asset;
      });
      return apiOk({ asset });
    }
    return apiOk({ asset: await updateAssetWorkflow(id, payload.workflowStatus, adminId) });
  } catch (error) {
    return handleApiError(error);
  }
}
