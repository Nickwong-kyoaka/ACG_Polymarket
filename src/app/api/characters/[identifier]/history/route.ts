import { AppError, apiOk, handleApiError } from "@/lib/api";
import { getMarketHistory, isMarketHistoryRange } from "@/lib/market-history";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const { identifier } = await params;
    const requestedRange = new URL(request.url).searchParams.get("range") ?? "7d";
    if (!isMarketHistoryRange(requestedRange)) {
      throw new AppError("range must be 24h, 7d, or 30d.", 422, "INVALID_HISTORY_RANGE");
    }
    return apiOk(await getMarketHistory(identifier, requestedRange));
  } catch (error) {
    return handleApiError(error);
  }
}
