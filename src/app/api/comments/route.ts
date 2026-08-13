import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { commentSchema } from "@/lib/schemas";
import { addComment } from "@/lib/store";
import { requireSessionUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const payload = commentSchema.parse(await parseJson(request));
    return apiOk({
      comment: await addComment(payload.characterId, payload.content, await requireSessionUserId()),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
