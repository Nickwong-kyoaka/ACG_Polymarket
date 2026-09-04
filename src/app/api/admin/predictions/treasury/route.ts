import { apiOk, handleApiError } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { getPredictionTreasuryStatus } from "@/lib/prediction-market";

export async function GET() {
  try {
    await requireAdminSessionUserId();
    return apiOk(await getPredictionTreasuryStatus());
  } catch (error) {
    return handleApiError(error);
  }
}
