import { NotFoundError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { updateCreatorSeries } from "@/lib/creator-series";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError();
    const userId = await requireSessionUserId();
    const { id } = await params;
    return apiOk(await updateCreatorSeries(userId, id, await parseJson(request)));
  } catch (error) {
    return handleApiError(error);
  }
}
