import { apiOk, handleApiError } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { purchaseShopItem } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await params;
    const userId = await requireSessionUserId();
    const key = request.headers.get("idempotency-key") ?? `equip-${userId}-${itemId}-${Date.now()}`;
    return apiOk(await purchaseShopItem(itemId, userId, true, key));
  } catch (error) {
    return handleApiError(error);
  }
}
