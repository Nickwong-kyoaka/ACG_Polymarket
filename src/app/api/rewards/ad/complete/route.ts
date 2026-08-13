import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { adCompleteSchema } from "@/lib/schemas";
import { completeAdReward } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = adCompleteSchema.parse(await parseJson(request));
    const key = payload.idempotencyKey ?? request.headers.get("idempotency-key") ?? undefined;
    return apiOk(
      await completeAdReward({
        ...payload,
        idempotencyKey: key,
        userId: await requireSessionUserId(),
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
