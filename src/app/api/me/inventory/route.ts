import { apiOk } from "@/lib/api";
import { getPortfolioView } from "@/lib/store";

export async function GET() {
  return apiOk({ inventory: (await getPortfolioView()).inventory });
}
