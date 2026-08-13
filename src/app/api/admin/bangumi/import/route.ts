import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { bangumiImportSchema } from "@/lib/schemas";
import { importBangumiCharacter } from "@/lib/store";
import { requireAdminSessionUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const payload = bangumiImportSchema.parse(await parseJson(request));
    return apiOk(await importBangumiCharacter(payload, await requireAdminSessionUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}
