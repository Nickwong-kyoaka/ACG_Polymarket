import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { adminShopItemSchema } from "@/lib/schemas";
import { createAdminShopItem } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = adminShopItemSchema.parse(await parseJson(request));
    return apiOk({ item: createAdminShopItem(payload) });
  } catch (error) {
    return handleApiError(error);
  }
}
