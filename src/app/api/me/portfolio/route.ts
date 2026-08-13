import { apiOk, handleApiError } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { getPortfolioView } from "@/lib/store";

export async function GET() {
  try {
    const portfolio = await getPortfolioView(await requireSessionUserId());
    return apiOk({ wallet: portfolio.wallet, positions: portfolio.positions });
  } catch (error) {
    return handleApiError(error);
  }
}
