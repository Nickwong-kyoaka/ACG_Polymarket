import { getOptionalSessionUserId } from "@/lib/auth";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requestMarketQuote } from "@/lib/market-quote";
import { tradeQuoteSchema } from "@/lib/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const payload = tradeQuoteSchema.parse(await parseJson(request));
    const { identifier } = await params;
    const userId = await getOptionalSessionUserId();
    return apiOk(await requestMarketQuote({ identifier, userId, ...payload }));
  } catch (error) {
    return handleApiError(error);
  }
}
