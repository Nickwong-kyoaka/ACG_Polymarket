import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { updateLibraryEntry } from "@/lib/catalog-community";

const schema = z.object({
  status: z.enum(["WANT", "WATCHING", "COMPLETED", "ON_HOLD", "DROPPED"]),
  private: z.boolean().optional(),
  startedAt: z.union([z.iso.datetime(), z.null()]).optional(),
  completedAt: z.union([z.iso.datetime(), z.null()]).optional(),
  rating: z
    .object({
      score: z.number().int().min(1).max(10),
      note: z.string().trim().max(1_000).nullable().optional(),
      private: z.boolean().optional(),
    })
    .nullable()
    .optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ seriesId: string }> },
) {
  try {
    const [{ seriesId }, userId, payload] = await Promise.all([
      params,
      requireSessionUserId(),
      parseJson(request).then((value) => schema.parse(value)),
    ]);
    return apiOk({
      entry: await updateLibraryEntry(userId, seriesId, {
        status: payload.status,
        private: payload.private,
        startedAt:
          payload.startedAt === undefined ? undefined : payload.startedAt ? new Date(payload.startedAt) : null,
        completedAt:
          payload.completedAt === undefined
            ? undefined
            : payload.completedAt
              ? new Date(payload.completedAt)
              : null,
        rating: payload.rating,
      }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
