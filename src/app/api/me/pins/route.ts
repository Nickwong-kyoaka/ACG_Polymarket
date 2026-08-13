import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { profilePinsSchema } from "@/lib/schemas";
import { updatePinnedCharacters } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = profilePinsSchema.parse(await parseJson(request));
    return apiOk({
      profile: await updatePinnedCharacters(payload.characterIds, await requireSessionUserId()),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
