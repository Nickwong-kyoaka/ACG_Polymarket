import { AppError, NotFoundError, apiOk, handleApiError } from "@/lib/api";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import {
  getPredictionHistory,
  type PredictionHistoryRange,
} from "@/lib/prediction-market";

const ranges = new Set<PredictionHistoryRange>(["24h", "7d", "30d"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    if (!getExchangeFeatureFlags().predictions) throw new NotFoundError("Predictions are not available.");
    const { identifier } = await params;
    const requestedRange = new URL(request.url).searchParams.get("range") ?? "24h";
    if (!ranges.has(requestedRange as PredictionHistoryRange)) {
      throw new AppError("Range must be 24h, 7d, or 30d.", 422, "INVALID_RANGE");
    }
    return apiOk(
      await getPredictionHistory(identifier, requestedRange as PredictionHistoryRange),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
