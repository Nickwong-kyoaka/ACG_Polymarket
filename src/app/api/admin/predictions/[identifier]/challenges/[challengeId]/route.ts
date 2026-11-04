import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { reviewPredictionChallenge } from "@/lib/prediction-market";

const reviewSchema = z.object({
  accepted: z.boolean(),
  evidenceUrl: z.string().url().max(2048),
  reasoning: z.string().trim().min(10).max(3000),
});

export async function POST(request: Request, { params }: {
  params: Promise<{ identifier: string; challengeId: string }>;
}) {
  try {
    const adminUserId = await requireAdminSessionUserId();
    const payload = reviewSchema.parse(await parseJson(request));
    return apiOk(await reviewPredictionChallenge({ ...await params, ...payload, adminUserId }));
  } catch (error) {
    return handleApiError(error);
  }
}
