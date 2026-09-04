import { z } from "zod";
import { NotFoundError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { challengePredictionResolution } from "@/lib/prediction-market";

const challengeSchema = z.object({
  proposalId: z.string().min(1).optional(),
  reason: z.string().trim().min(10).max(1000),
  evidenceUrl: z.string().url().max(2048),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    if (!getExchangeFeatureFlags().predictions) throw new NotFoundError("Predictions are not available.");
    const payload = challengeSchema.parse(await parseJson(request));
    const { identifier } = await params;
    return apiOk(
      await challengePredictionResolution({
        identifier,
        ...payload,
        userId: await requireSessionUserId(),
      }),
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
