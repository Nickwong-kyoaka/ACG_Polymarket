import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/schemas";
import { getPortfolioView, updateProfile } from "@/lib/store";

export async function GET() {
  try {
    return apiOk({ profile: (await getPortfolioView(await requireSessionUserId())).profile });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = profileUpdateSchema.parse(await parseJson(request));
    return apiOk({ profile: await updateProfile(payload, await requireSessionUserId()) });
  } catch (error) {
    return handleApiError(error);
  }
}
