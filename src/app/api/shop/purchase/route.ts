import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { shopPurchaseSchema } from "@/lib/schemas";
import { purchaseShopItem } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = shopPurchaseSchema.parse(await parseJson(request));
    return apiOk(purchaseShopItem(payload.itemId, payload.userId, payload.equip));
  } catch (error) {
    return handleApiError(error);
  }
}
