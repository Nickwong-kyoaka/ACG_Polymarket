import { NotFoundError, apiOk, handleApiError } from "@/lib/api";
import { getOptionalSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { getPublicPost, postDetailQuerySchema } from "@/lib/social";

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
