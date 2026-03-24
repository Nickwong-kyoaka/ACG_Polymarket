import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { commentSchema } from "@/lib/schemas";
import { addComment } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = commentSchema.parse(await parseJson(request));
    return apiOk({ comment: addComment(payload.characterId, payload.content, payload.userId) });
  } catch (error) {
    return handleApiError(error);
  }
}
