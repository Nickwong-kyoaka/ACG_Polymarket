import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { bangumiImportInputSchema, stageBangumiSubjectImport } from "@/lib/bangumi-import";
import { requireAdminSessionUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const adminId = await requireAdminSessionUserId();
    const payload = bangumiImportInputSchema.parse(await parseJson(request));
    return apiOk(await stageBangumiSubjectImport(adminId, payload));
  } catch (error) {
    return handleApiError(error);
  }
}
