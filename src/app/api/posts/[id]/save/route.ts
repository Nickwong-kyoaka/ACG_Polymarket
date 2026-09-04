import { NotFoundError, apiOk, handleApiError } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { setPostSave } from "@/lib/social";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError("Community is not available.");
    const [{ id }, userId] = await Promise.all([params, requireSessionUserId()]);
    return apiOk(await setPostSave(userId, id, true));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError("Community is not available.");
    const [{ id }, userId] = await Promise.all([params, requireSessionUserId()]);
    return apiOk(await setPostSave(userId, id, false));
  } catch (error) {
    return handleApiError(error);
  }
}
