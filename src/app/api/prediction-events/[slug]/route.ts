import { NotFoundError, apiOk, handleApiError } from "@/lib/api";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { getPredictionEvent } from "@/lib/prediction-market";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    if (!getExchangeFeatureFlags().predictions) throw new NotFoundError("Predictions are not available.");
    const { slug } = await params;
    const locale = new URL(request.url).searchParams.get("locale") === "zh-Hant" ? "zh-Hant" : "en";
    return apiOk(await getPredictionEvent(slug, locale));
  } catch (error) {
    return handleApiError(error);
  }
}
