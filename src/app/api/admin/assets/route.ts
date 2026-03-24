import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { adminAssetSchema } from "@/lib/schemas";
import { createAdminAsset } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = adminAssetSchema.parse(await parseJson(request));
    return apiOk({ asset: createAdminAsset(payload) });
  } catch (error) {
    return handleApiError(error);
  }
}
