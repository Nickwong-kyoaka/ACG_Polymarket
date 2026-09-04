import { NotFoundError, apiOk, handleApiError } from "@/lib/api";
import { getOptionalSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { feedQuerySchema, getSocialFeed } from "@/lib/social";

export async function GET(request: Request) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError("Community is not available.");
    const params = new URL(request.url).searchParams;
    const query = feedQuerySchema.parse({
      mode: params.get("mode") ?? params.get("tab") ?? params.get("feed") ?? undefined,
      locale: params.get("locale") ?? undefined,
      cursor: params.get("cursor") ?? undefined,
      limit: params.get("limit") ?? undefined,
    });
    return apiOk(
      await getSocialFeed({
        ...query,
        viewerId: await getOptionalSessionUserId(),
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
