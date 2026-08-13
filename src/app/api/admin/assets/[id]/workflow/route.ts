import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { assetWorkflowSchema } from "@/lib/schemas";
import { updateAssetWorkflow } from "@/lib/store";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = assetWorkflowSchema.parse(await parseJson(request));
    return apiOk({
      asset: await updateAssetWorkflow(id, payload.workflowStatus, await requireAdminSessionUserId()),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
