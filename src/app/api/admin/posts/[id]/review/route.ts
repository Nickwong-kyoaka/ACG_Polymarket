import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { reviewCommunityPost } from "@/lib/catalog-community";

const schema = z.object({
  decision: z.enum(["REQUEST_CHANGES", "APPROVE", "REJECT"]),
  note: z.string().trim().max(2_000).default(""),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [{ id }, reviewerId, payload] = await Promise.all([
      params,
      requireAdminSessionUserId(),
      parseJson(request).then((value) => schema.parse(value)),
    ]);
    return apiOk(await reviewCommunityPost(reviewerId, id, payload));
  } catch (error) {
    return handleApiError(error);
  }
}
