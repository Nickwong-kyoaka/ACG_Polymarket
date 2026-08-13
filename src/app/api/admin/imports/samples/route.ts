import { bangumiImportSamples } from "@/data/bangumi-samples";
import { apiOk, handleApiError } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdminSessionUserId();
    return apiOk({ samples: bangumiImportSamples });
  } catch (error) {
    return handleApiError(error);
  }
}
