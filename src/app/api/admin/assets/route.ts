import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { adminAssetSchema } from "@/lib/schemas";
import { createAdminAsset } from "@/lib/store";
import { requireAdminSessionUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const payload = adminAssetSchema.parse(await parseJson(request));
    return apiOk({ asset: await createAdminAsset(payload, await requireAdminSessionUserId()) });
  } catch (error) {
    return handleApiError(error);
  }
}
