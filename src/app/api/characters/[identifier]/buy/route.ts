import { AppError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { tradeSchema } from "@/lib/schemas";
import { buySupport } from "@/lib/store";
import { requireSessionUserId } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const payload = tradeSchema.parse(await parseJson(request));
    const { identifier } = await params;
    const userId = await requireSessionUserId();
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey) {
      throw new AppError("Idempotency-Key header is required.", 422, "IDEMPOTENCY_KEY_REQUIRED");
    }
    return apiOk(
      await buySupport(identifier, payload.quantity, payload.quoteToken, userId, idempotencyKey),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
