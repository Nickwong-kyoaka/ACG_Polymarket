import { apiOk } from "@/lib/api";
import { getPortfolioView } from "@/lib/store";

export async function GET() {
  const portfolio = await getPortfolioView();
  return apiOk({
    wallet: portfolio.wallet,
    positions: portfolio.positions,
  });
}
