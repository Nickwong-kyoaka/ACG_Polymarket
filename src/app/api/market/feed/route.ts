import { apiOk, handleApiError } from "@/lib/api";
import { getMarketFeed } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 12);
    return apiOk(await getMarketFeed(limit));
  } catch (error) {
    return handleApiError(error);
  }
}
