import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { toggleWatchlist } from "@/lib/store";
import { watchlistSchema } from "@/lib/schemas";
import { requireSessionUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const payload = watchlistSchema.parse(await parseJson(request));
    return apiOk(await toggleWatchlist(payload.characterId, await requireSessionUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}
