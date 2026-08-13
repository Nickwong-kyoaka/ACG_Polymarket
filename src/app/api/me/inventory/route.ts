import { apiOk, handleApiError } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { getPortfolioView } from "@/lib/store";

export async function GET() {
  try {
    return apiOk({ inventory: (await getPortfolioView(await requireSessionUserId())).inventory });
  } catch (error) {
    return handleApiError(error);
  }
}
