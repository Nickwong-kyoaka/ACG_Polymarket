import { NotFoundError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { createPost, createPostInputSchema } from "@/lib/social";

export async function POST(request: Request) {
  try {
    const features = getExchangeFeatureFlags();
    if (!features.community || !features.submissions) throw new NotFoundError("Submissions are not available.");
    const [userId, payload] = await Promise.all([
      requireSessionUserId(),
      parseJson(request).then((input) => createPostInputSchema.parse(input)),
    ]);
    return apiOk(await createPost(userId, payload), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
