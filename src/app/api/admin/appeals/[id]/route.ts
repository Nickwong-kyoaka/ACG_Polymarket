import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { decideModerationAppeal } from "@/lib/moderation-appeals";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const adminId = await requireAdminSessionUserId(); const { id } = await params; return apiOk(await decideModerationAppeal(adminId, id, await parseJson(request))); }
  catch (error) { return handleApiError(error); }
}
