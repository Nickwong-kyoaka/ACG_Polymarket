import { apiOk, handleApiError } from "@/lib/api";
import { claimAdReward } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;
    return apiOk(await claimAdReward(undefined, idempotencyKey));
  } catch (error) {
    return handleApiError(error);
  }
}
