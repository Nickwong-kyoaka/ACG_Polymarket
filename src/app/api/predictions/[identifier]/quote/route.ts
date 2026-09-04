import { z } from "zod";
import { NotFoundError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { requestPredictionQuote } from "@/lib/prediction-market";

const quoteSchema = z.object({
  outcome: z.string().trim().min(1).max(64),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().int().min(1).max(3),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    if (!getExchangeFeatureFlags().predictions) throw new NotFoundError("Predictions are not available.");
    const payload = quoteSchema.parse(await parseJson(request));
    const { identifier } = await params;
    return apiOk(
      await requestPredictionQuote({
        identifier,
        ...payload,
        userId: await requireSessionUserId(),
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
