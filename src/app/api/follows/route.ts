import { NotFoundError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { followInputSchema, toggleFollow } from "@/lib/social";

export async function POST(request: Request) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError("Community is not available.");
    const [userId, payload] = await Promise.all([
      requireSessionUserId(),
      parseJson(request).then((input) => followInputSchema.parse(input)),
    ]);
    return apiOk(await toggleFollow(userId, payload));
  } catch (error) {
    return handleApiError(error);
  }
}
