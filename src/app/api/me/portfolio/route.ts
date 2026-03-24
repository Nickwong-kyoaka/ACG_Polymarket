import { apiOk } from "@/lib/api";
import { getPortfolioView } from "@/lib/store";

export function GET() {
  const portfolio = getPortfolioView();
  return apiOk({
    wallet: portfolio.wallet,
    positions: portfolio.positions,
  });
}
