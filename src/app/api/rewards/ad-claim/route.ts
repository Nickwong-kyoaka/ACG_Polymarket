import { AppError, handleApiError } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";

export async function POST() {
  try {
    await requireSessionUserId();
    throw new AppError("Start and complete an ad session to claim a reward.", 410, "AD_SESSION_REQUIRED");
  } catch (error) {
    return handleApiError(error);
  }
}
