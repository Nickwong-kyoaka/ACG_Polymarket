import { AppError, NotFoundError, apiOk, handleApiError } from "@/lib/api";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { listPredictionEvents, type PredictionLocale } from "@/lib/prediction-market";

export async function GET(request: Request) {
  try {
    if (!getExchangeFeatureFlags().predictions) throw new NotFoundError("Predictions are not available.");
    const url = new URL(request.url);
    const rawLimit = url.searchParams.get("limit");
    const limit = rawLimit ? Number(rawLimit) : undefined;
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 50)) {
      throw new AppError("Limit must be an integer between 1 and 50.", 422, "INVALID_LIMIT");
    }
    const locale = url.searchParams.get("locale") === "zh-Hant" ? "zh-Hant" : "en";
    return apiOk(
      await listPredictionEvents({
        locale: locale as PredictionLocale,
        cursor: url.searchParams.get("cursor") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        limit,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
