import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { comfortSessionSchema } from "@/lib/schemas";
import { createComfortSession } from "@/lib/store";
import { requireSessionUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const payload = comfortSessionSchema.parse(await parseJson(request));
    return apiOk({
      session: await createComfortSession({ ...payload, userId: await requireSessionUserId() }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
