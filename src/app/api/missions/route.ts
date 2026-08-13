import { apiOk, handleApiError } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { getDailyMissions } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const locale = new URL(request.url).searchParams.get("locale") === "zh-Hant" ? "zh-Hant" : "en";
    return apiOk({ missions: await getDailyMissions(await requireSessionUserId(), locale) });
  } catch (error) {
    return handleApiError(error);
  }
}
