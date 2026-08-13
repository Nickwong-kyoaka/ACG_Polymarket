import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { reactionSchema } from "@/lib/schemas";
import { toggleReaction } from "@/lib/store";
import { requireSessionUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const payload = reactionSchema.parse(await parseJson(request));
    return apiOk(
      await toggleReaction(payload.characterId, payload.kind, await requireSessionUserId()),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
