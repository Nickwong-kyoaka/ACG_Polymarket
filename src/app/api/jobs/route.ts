import { apiOk, handleApiError } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { getWorkDashboard } from "@/lib/store";

export async function GET() {
  try {
    return apiOk(await getWorkDashboard(await requireSessionUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}
