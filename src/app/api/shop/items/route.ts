import { apiOk, handleApiError } from "@/lib/api";
import { getShopItems } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const locale = new URL(request.url).searchParams.get("locale") === "zh-Hant" ? "zh-Hant" : "en";
    return apiOk({ items: await getShopItems(locale) });
  } catch (error) {
    return handleApiError(error);
  }
}
