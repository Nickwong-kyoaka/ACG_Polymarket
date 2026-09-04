import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { finalizePredictionResolution } from "@/lib/prediction-market";

const finalizeSchema = z.object({
  proposalId: z.string().min(1).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const payload = finalizeSchema.parse(await parseJson(request));
    const { identifier } = await params;
    return apiOk(
      await finalizePredictionResolution({
        identifier,
        ...payload,
        adminUserId: await requireAdminSessionUserId(),
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
