import { apiOk, handleApiError } from "@/lib/api";
import { claimDailyReward } from "@/lib/store";
import { requireSessionUserId } from "@/lib/auth";

export async function POST() {
  try {
    return apiOk(await claimDailyReward(await requireSessionUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}
