import { NotFoundError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { creatorSeriesSubscriptionSchema, setCreatorSeriesSubscription } from "@/lib/creator-series";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError();
    const userId = await requireSessionUserId();
    const { subscribed } = creatorSeriesSubscriptionSchema.parse(await parseJson(request));
    const { id } = await params;
    return apiOk(await setCreatorSeriesSubscription(userId, id, subscribed));
  } catch (error) {
    return handleApiError(error);
  }
}
