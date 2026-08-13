import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { workStartSchema } from "@/lib/schemas";
import { startWorkShift } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = workStartSchema.parse(await parseJson(request));
    const key = payload.idempotencyKey ?? request.headers.get("idempotency-key") ?? undefined;
    return apiOk(
      await startWorkShift({ ...payload, idempotencyKey: key }, await requireSessionUserId()),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
