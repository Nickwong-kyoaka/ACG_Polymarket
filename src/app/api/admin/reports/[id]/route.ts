import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { decideReport, reportDecisionSchema } from "@/lib/report-moderation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await requireAdminSessionUserId();
    const { id } = await params;
    const input = reportDecisionSchema.parse(await parseJson(request));
    return apiOk(await decideReport(adminId, id, input));
  } catch (error) { return handleApiError(error); }
}
