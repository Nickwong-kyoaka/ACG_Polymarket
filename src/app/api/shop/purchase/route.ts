import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { shopPurchaseSchema } from "@/lib/schemas";
import { purchaseShopItem } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = shopPurchaseSchema.parse(await parseJson(request));
    const idempotencyKey = payload.idempotencyKey ?? request.headers.get("idempotency-key") ?? undefined;
    return apiOk(await purchaseShopItem(payload.itemId, payload.userId, payload.equip, idempotencyKey));
  } catch (error) {
    return handleApiError(error);
  }
}
