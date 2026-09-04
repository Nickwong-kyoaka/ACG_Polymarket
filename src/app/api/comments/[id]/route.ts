import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { markCommentByPostAuthor } from "@/lib/discussions";

const actionSchema = z.object({ action: z.enum(["PIN", "HEART"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const [{ id }, payload, userId] = await Promise.all([params, parseJson(request).then((value) => actionSchema.parse(value)), requireSessionUserId()]);
    return apiOk({ comment: await markCommentByPostAuthor(id, payload.action, userId) });
  } catch (error) {
    return handleApiError(error);
  }
}
