import { apiOk, handleApiError } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { startAdReward } from "@/lib/store";

export async function POST() {
  try {
    return apiOk(await startAdReward(await requireSessionUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}
