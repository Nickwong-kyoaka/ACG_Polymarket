import { apiOk, handleApiError, NotFoundError } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { listMyPosts } from "@/lib/social";

export async function GET() {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError();
    return apiOk(await listMyPosts(await requireSessionUserId()));
  } catch (error) { return handleApiError(error); }
}
