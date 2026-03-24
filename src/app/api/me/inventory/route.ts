import { apiOk } from "@/lib/api";
import { getPortfolioView } from "@/lib/store";

export function GET() {
  return apiOk({ inventory: getPortfolioView().inventory });
}
