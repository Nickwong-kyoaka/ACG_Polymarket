import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { bangumiImportSchema } from "@/lib/schemas";
import { importBangumiCharacter } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = bangumiImportSchema.parse(await parseJson(request));
    return apiOk(importBangumiCharacter(payload));
  } catch (error) {
    return handleApiError(error);
  }
}
