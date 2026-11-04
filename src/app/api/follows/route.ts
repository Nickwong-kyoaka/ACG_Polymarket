import { NotFoundError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { getOptionalSessionUserId, requireSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { followInputSchema, toggleFollow } from "@/lib/social";

export async function GET(request: Request) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError();
    const userId = await getOptionalSessionUserId();
    if (!userId) return apiOk({ following: false });
    const params = new URL(request.url).searchParams;
    const { targetType, targetId } = followInputSchema.parse({ targetType: params.get("targetType"), targetId: params.get("targetId") });
    const following = targetType === "user"
      ? await prisma.userFollow.findUnique({ where: { followerId_targetId: { followerId: userId, targetId } } })
      : targetType === "character" ? await prisma.characterFollow.findUnique({ where: { userId_characterId: { userId, characterId: targetId } } })
        : await prisma.topicFollow.findUnique({ where: { userId_topicId: { userId, topicId: targetId } } });
    return apiOk({ following: Boolean(following) });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    if (!getExchangeFeatureFlags().community) throw new NotFoundError("Community is not available.");
    const [userId, payload] = await Promise.all([
      requireSessionUserId(),
      parseJson(request).then((input) => followInputSchema.parse(input)),
    ]);
    return apiOk(await toggleFollow(userId, payload));
  } catch (error) {
    return handleApiError(error);
  }
}
