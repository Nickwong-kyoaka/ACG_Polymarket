import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { shopPurchaseSchema } from "@/lib/schemas";
import { purchaseShopItem } from "@/lib/store";
import { requireSessionUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const payload = shopPurchaseSchema.parse(await parseJson(request));
    const userId = await requireSessionUserId();
    const idempotencyKey = payload.idempotencyKey ?? request.headers.get("idempotency-key") ?? undefined;
    return apiOk(await purchaseShopItem(payload.itemId, userId, payload.equip, idempotencyKey));
  } catch (error) {
    return handleApiError(error);
  }
}
