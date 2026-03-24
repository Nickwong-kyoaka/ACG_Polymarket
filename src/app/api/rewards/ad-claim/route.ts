import { apiOk, handleApiError } from "@/lib/api";
import { claimAdReward } from "@/lib/store";

export async function POST() {
  try {
    return apiOk(claimAdReward());
  } catch (error) {
    return handleApiError(error);
  }
}
