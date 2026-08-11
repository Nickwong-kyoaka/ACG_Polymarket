import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { tradeSchema } from "@/lib/schemas";
import { sellSupport } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const payload = tradeSchema.parse(await parseJson(request));
    const { identifier } = await params;
    const idempotencyKey = payload.idempotencyKey ?? request.headers.get("idempotency-key") ?? undefined;
    return apiOk(await sellSupport(identifier, payload.quantity, payload.userId, idempotencyKey));
  } catch (error) {
    return handleApiError(error);
  }
}
