import { requireSessionUserId } from "@/lib/auth";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { createMarketAlert, listMarketAlerts } from "@/lib/market-alerts";
import { marketAlertSchema } from "@/lib/schemas";

export async function GET() {
  try {
    return apiOk({ alerts: await listMarketAlerts(await requireSessionUserId()) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = marketAlertSchema.parse(await parseJson(request));
    return apiOk(
      await createMarketAlert({ ...payload, userId: await requireSessionUserId() }),
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
