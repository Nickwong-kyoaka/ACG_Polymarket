import { apiOk, handleApiError, NotFoundError, parseJson } from "@/lib/api";
import { getOptionalSessionUserId, requireSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { createCollectionInputSchema, deleteOwnCollection, getVisibleCollection, updateOwnCollection } from "@/lib/social";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError();
    const { id } = await params;
    const locale = new URL(request.url).searchParams.get("locale") === "zh-Hant" ? "zh-Hant" : "en";
    return apiOk({ collection: await getVisibleCollection(id, locale, await getOptionalSessionUserId()) });
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError();
    const userId = await requireSessionUserId();
    const { id } = await params;
    return apiOk(await updateOwnCollection(userId, id, createCollectionInputSchema.parse(await parseJson(request))));
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError();
    const userId = await requireSessionUserId();
    const { id } = await params;
    return apiOk(await deleteOwnCollection(userId, id));
  } catch (error) { return handleApiError(error); }
}
