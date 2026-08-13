import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { uploadPresignSchema } from "@/lib/schemas";
import { createPresignedAssetUpload } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    await requireAdminSessionUserId();
    const payload = uploadPresignSchema.parse(await parseJson(request));
    return apiOk(await createPresignedAssetUpload(payload));
  } catch (error) {
    return handleApiError(error);
  }
}
