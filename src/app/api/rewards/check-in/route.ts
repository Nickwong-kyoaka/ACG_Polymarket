import { apiOk, handleApiError } from "@/lib/api";
import { claimDailyReward } from "@/lib/store";

export async function POST() {
  try {
    return apiOk(await claimDailyReward());
  } catch (error) {
    return handleApiError(error);
  }
}
