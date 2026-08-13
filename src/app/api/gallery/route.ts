import { apiOk, handleApiError } from "@/lib/api";
import { listPublicGallery } from "@/lib/public-media";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    return apiOk(await listPublicGallery({ locale: query.get("locale") === "zh-Hant" ? "zh-Hant" : "en", character: query.get("character") ?? undefined, cursor: query.get("cursor") ?? undefined, limit: Number(query.get("limit") ?? 24) }));
  } catch (error) { return handleApiError(error); }
}
