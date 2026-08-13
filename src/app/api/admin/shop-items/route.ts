import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { adminShopItemSchema } from "@/lib/schemas";
import { createAdminShopItem } from "@/lib/store";
import { requireAdminSessionUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const payload = adminShopItemSchema.parse(await parseJson(request));
    return apiOk({ item: await createAdminShopItem(payload, await requireAdminSessionUserId()) });
  } catch (error) {
    return handleApiError(error);
  }
}
