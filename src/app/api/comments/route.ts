import { NotFoundError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { commentSchema } from "@/lib/schemas";
import { requireSessionUserId } from "@/lib/auth";
import { createDiscussionComment } from "@/lib/discussions";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";

export async function POST(request: Request) {
  try {
    const payload = commentSchema.parse(await parseJson(request));
    const features = getExchangeFeatureFlags();
    if (payload.postId && !features.community) throw new NotFoundError("Community is not available.");
    if (payload.predictionMarketId && !features.predictions) throw new NotFoundError("Predictions are not available.");
    return apiOk({
      comment: await createDiscussionComment(payload, await requireSessionUserId()),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
