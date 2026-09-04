import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { proposePredictionResolution } from "@/lib/prediction-market";

const proposalSchema = z.object({
  outcome: z.string().trim().min(1).max(64),
  evidenceUrl: z.string().url().max(2048),
  reasoning: z.string().trim().min(10).max(3000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const payload = proposalSchema.parse(await parseJson(request));
    const { identifier } = await params;
    return apiOk(
      await proposePredictionResolution({
        identifier,
        ...payload,
        adminUserId: await requireAdminSessionUserId(),
      }),
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
