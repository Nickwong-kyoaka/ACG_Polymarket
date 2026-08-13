import { AppError, apiOk, handleApiError } from "@/lib/api";
import { getPositiveMarketFeed } from "@/lib/market-feed";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const limit = Number(params.get("limit") ?? 12);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new AppError("limit must be an integer between 1 and 50.", 422, "INVALID_LIMIT");
    }
    const locale = params.get("locale") === "zh-Hant" ? "zh-Hant" : "en";
    const rights = params.get("rightsType")?.toUpperCase();
    if (rights && rights !== "ORIGINAL" && rights !== "LICENSED") {
      throw new AppError("rightsType must be ORIGINAL or LICENSED.", 422, "INVALID_FILTER");
    }
    const requestedSort = params.get("sort") ?? "trending";
    const sorts = ["trending", "quote-asc", "quote-desc", "newest", "supporters"] as const;
    if (!sorts.includes(requestedSort as (typeof sorts)[number])) {
      throw new AppError("Unsupported market sort.", 422, "INVALID_SORT");
    }
    return apiOk(
      await getPositiveMarketFeed({
        limit,
        cursor: params.get("cursor") ?? undefined,
        locale,
        search: params.get("search") ?? undefined,
        tag: params.get("tag") ?? undefined,
        rightsType: rights as "ORIGINAL" | "LICENSED" | undefined,
        featuredOnly: params.get("featured") === "true",
        sort: requestedSort as (typeof sorts)[number],
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
