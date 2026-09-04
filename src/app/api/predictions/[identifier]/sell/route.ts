import { z } from "zod";
import { AppError, NotFoundError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { sellPredictionShares } from "@/lib/prediction-market";

const tradeSchema = z.object({
  outcome: z.string().trim().min(1).max(64),
  quantity: z.number().int().min(1).max(3),
  quoteToken: z.string().min(32).max(4096),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    if (!getExchangeFeatureFlags().predictions) throw new NotFoundError("Predictions are not available.");
    const payload = tradeSchema.parse(await parseJson(request));
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey) {
      throw new AppError("Idempotency-Key header is required.", 422, "IDEMPOTENCY_KEY_REQUIRED");
    }
    const { identifier } = await params;
    return apiOk(
      await sellPredictionShares({
        identifier,
        ...payload,
        userId: await requireSessionUserId(),
        idempotencyKey,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
