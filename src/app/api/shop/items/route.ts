import { apiOk } from "@/lib/api";
import { getShopItems } from "@/lib/store";

export function GET() {
  return apiOk({ items: getShopItems() });
}
