import { NotFoundError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { getOptionalSessionUserId, requireSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import {
  collectionListQuerySchema,
  createCollection,
  createCollectionInputSchema,
  listCollections,
} from "@/lib/social";

export async function GET(request: Request) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError("Community is not available.");
    const params = new URL(request.url).searchParams;
    const query = collectionListQuerySchema.parse({
      locale: params.get("locale") ?? undefined,
      cursor: params.get("cursor") ?? undefined,
      limit: params.get("limit") ?? undefined,
      owner: params.get("owner") ?? undefined,
      mine: params.get("mine") ?? undefined,
    });
    return apiOk(
      await listCollections({
        ...query,
        viewerId: await getOptionalSessionUserId(),
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError("Community is not available.");
    const [userId, payload] = await Promise.all([
      requireSessionUserId(),
      parseJson(request).then((input) => createCollectionInputSchema.parse(input)),
    ]);
    return apiOk(await createCollection(userId, payload), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
