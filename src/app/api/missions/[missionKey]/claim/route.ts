import { apiOk, AppError, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { missionClaimSchema } from "@/lib/schemas";
import { claimMissionReward } from "@/lib/store";

const missionKeys = ["COMFORT_SESSION", "POSITIVE_REACTION", "SUPPORT_OR_WATCH"] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ missionKey: string }> },
) {
  try {
    const payload = missionClaimSchema.parse(await parseJson(request));
    const { missionKey } = await params;
    if (!missionKeys.includes(missionKey as (typeof missionKeys)[number])) {
      throw new AppError("Mission not found.", 404, "MISSION_NOT_FOUND");
    }
    const userId = await requireSessionUserId();
    const key = payload.idempotencyKey ?? request.headers.get("idempotency-key") ?? undefined;
    return apiOk(
      await claimMissionReward(missionKey as (typeof missionKeys)[number], userId, key),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
