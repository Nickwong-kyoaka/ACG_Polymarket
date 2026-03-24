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
    return apiOk(sellSupport(identifier, payload.quantity, payload.userId));
  } catch (error) {
    return handleApiError(error);
  }
}
