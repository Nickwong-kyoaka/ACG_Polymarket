import { NotFoundError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { postReactionInputSchema, togglePostReaction } from "@/lib/social";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError("Community is not available.");
    const [{ id }, userId, payload] = await Promise.all([
      params,
      requireSessionUserId(),
      parseJson(request).then((input) => postReactionInputSchema.parse(input)),
    ]);
    return apiOk(await togglePostReaction(userId, id, payload.kind));
  } catch (error) {
    return handleApiError(error);
  }
}
