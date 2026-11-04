import { NotFoundError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { createCreatorSeries, listCreatorSeries, listMyCreatorSeries } from "@/lib/creator-series";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";

export async function GET(request: Request) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError();
    const mine = new URL(request.url).searchParams.get("mine") === "1";
    return apiOk(mine ? await listMyCreatorSeries(await requireSessionUserId()) : await listCreatorSeries());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const features = getExchangeFeatureFlags();
    if (!features.community || !features.submissions) throw new NotFoundError("Submissions are not available.");
    const userId = await requireSessionUserId();
    return apiOk(await createCreatorSeries(userId, await parseJson(request)), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
