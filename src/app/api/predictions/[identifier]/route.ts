import { NotFoundError, apiOk, handleApiError } from "@/lib/api";
import { getOptionalSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { getPredictionMarket } from "@/lib/prediction-market";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    if (!getExchangeFeatureFlags().predictions) throw new NotFoundError("Predictions are not available.");
    const { identifier } = await params;
    const locale = new URL(request.url).searchParams.get("locale") === "zh-Hant" ? "zh-Hant" : "en";
    return apiOk(
      await getPredictionMarket(identifier, locale, await getOptionalSessionUserId()),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
