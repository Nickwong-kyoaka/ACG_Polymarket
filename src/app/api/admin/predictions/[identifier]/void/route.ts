import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { voidPredictionMarket } from "@/lib/prediction-market";

const voidSchema = z.object({
  reason: z.string().trim().min(10).max(3000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const payload = voidSchema.parse(await parseJson(request));
    const { identifier } = await params;
    return apiOk(
      await voidPredictionMarket({
        identifier,
        ...payload,
        adminUserId: await requireAdminSessionUserId(),
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
