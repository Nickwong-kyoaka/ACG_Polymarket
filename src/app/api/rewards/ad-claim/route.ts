import { apiOk, handleApiError } from "@/lib/api";
import { claimAdReward } from "@/lib/store";
import { requireSessionUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;
    return apiOk(await claimAdReward(await requireSessionUserId(), idempotencyKey));
  } catch (error) {
    return handleApiError(error);
  }
}
