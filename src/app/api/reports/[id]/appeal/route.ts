import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { appealSchema, submitModerationAppeal } from "@/lib/moderation-appeals";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const userId = await requireSessionUserId(); const { id } = await params; const { reason } = appealSchema.parse(await parseJson(request)); return apiOk(await submitModerationAppeal(userId, id, reason)); }
  catch (error) { return handleApiError(error); }
}
