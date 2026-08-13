import { getOptionalSessionUserId } from "@/lib/auth";
import { apiOk, handleApiError } from "@/lib/api";
import { listSupportCampaigns } from "@/lib/support-campaigns";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    return apiOk({
      campaigns: await listSupportCampaigns({
        userId: await getOptionalSessionUserId(),
        locale: params.get("locale") === "zh-Hant" ? "zh-Hant" : "en",
        characterId: params.get("characterId") ?? undefined,
        includeCompleted: params.get("includeCompleted") === "true",
      }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
