import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { characterWorkflowSchema } from "@/lib/schemas";
import { updateCharacterWorkflow } from "@/lib/store";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = characterWorkflowSchema.parse(await parseJson(request));
    return apiOk({
      character: await updateCharacterWorkflow(id, payload.publishStatus, await requireAdminSessionUserId()),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
