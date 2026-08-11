import { apiOk } from "@/lib/api";
import { getShopItems } from "@/lib/store";

export async function GET() {
  return apiOk({ items: await getShopItems() });
}
