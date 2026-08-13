import { apiOk, handleApiError } from "@/lib/api";
import { listComfortModes } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const locale = new URL(request.url).searchParams.get("locale") === "zh-Hant" ? "zh-Hant" : "en";
    return apiOk({ modes: await listComfortModes(locale) });
  } catch (error) {
    return handleApiError(error);
  }
}
