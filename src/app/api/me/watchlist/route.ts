import { apiOk, handleApiError } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { getPortfolioView } from "@/lib/store";

export async function GET() {
  try {
    return apiOk({ watchlist: (await getPortfolioView(await requireSessionUserId())).watchlist });
  } catch (error) {
    return handleApiError(error);
  }
}
