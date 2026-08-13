import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { tradeSchema } from "@/lib/schemas";
import { sellSupport } from "@/lib/store";
import { requireSessionUserId } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const payload = tradeSchema.parse(await parseJson(request));
    const { identifier } = await params;
    const userId = await requireSessionUserId();
    const idempotencyKey = payload.idempotencyKey ?? request.headers.get("idempotency-key") ?? undefined;
    return apiOk(await sellSupport(identifier, payload.quantity, userId, idempotencyKey));
  } catch (error) {
    return handleApiError(error);
  }
}
