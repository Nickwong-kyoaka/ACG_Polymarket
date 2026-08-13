import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { workClaimSchema } from "@/lib/schemas";
import { claimWorkShift } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shiftId: string }> },
) {
  try {
    const payload = workClaimSchema.parse(await parseJson(request));
    const { shiftId } = await params;
    const key = payload.idempotencyKey ?? request.headers.get("idempotency-key") ?? undefined;
    return apiOk(await claimWorkShift(shiftId, await requireSessionUserId(), key));
  } catch (error) {
    return handleApiError(error);
  }
}
