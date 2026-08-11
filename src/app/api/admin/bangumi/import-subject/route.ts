import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { bangumiSubjectImportSchema } from "@/lib/schemas";
import { importBangumiSubject } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = bangumiSubjectImportSchema.parse(await parseJson(request));
    return apiOk(await importBangumiSubject(payload.subjectId, payload.userId));
  } catch (error) {
    return handleApiError(error);
  }
}
