import { apiOk, handleApiError } from "@/lib/api";
import { listPublicSources } from "@/lib/public-media";

export async function GET(request: Request) {
  try { return apiOk({ items: await listPublicSources(new URL(request.url).searchParams.get("locale") === "zh-Hant" ? "zh-Hant" : "en") }); }
  catch (error) { return handleApiError(error); }
}
