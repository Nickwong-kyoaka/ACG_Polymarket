import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { updateEpisodeProgress } from "@/lib/catalog-community";

const schema = z.object({ status: z.enum(["PLANNED", "WATCHED", "SKIPPED"]) });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> },
) {
  try {
    const [{ episodeId }, userId, payload] = await Promise.all([
      params,
      requireSessionUserId(),
      parseJson(request).then((value) => schema.parse(value)),
    ]);
    return apiOk({ progress: await updateEpisodeProgress(userId, episodeId, payload.status) });
  } catch (error) {
    return handleApiError(error);
  }
}
