import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { comfortReactionSchema } from "@/lib/schemas";
import { createComfortReaction } from "@/lib/store";
import { requireSessionUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const payload = comfortReactionSchema.parse(await parseJson(request));
    return apiOk({
      reaction: await createComfortReaction({ ...payload, userId: await requireSessionUserId() }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
