import { NotFoundError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { getOptionalSessionUserId, requireSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { createPostInputSchema, getPublicPost, postDetailQuerySchema, updateOwnPost } from "@/lib/social";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const flags = getExchangeFeatureFlags();
    if (!flags.community || !flags.submissions) throw new NotFoundError();
    const userId = await requireSessionUserId();
    const { id } = await params;
    const input = createPostInputSchema.parse(await parseJson(request));
    return apiOk(await updateOwnPost(userId, id, input));
  } catch (error) { return handleApiError(error); }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError("Community is not available.");
    const [{ id }, viewerId] = await Promise.all([params, getOptionalSessionUserId()]);
    const search = new URL(request.url).searchParams;
    const query = postDetailQuerySchema.parse({
      locale: search.get("locale") ?? undefined,
    });
    return apiOk(await getPublicPost(id, query.locale, viewerId));
  } catch (error) {
    return handleApiError(error);
  }
}
