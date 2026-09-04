import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { createPredictionEvent } from "@/lib/prediction-market";

const eventLocaleSchema = z.object({
  locale: z.enum(["en", "zh-Hant"]),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10).max(2000),
});

const createEventSchema = z.object({
  slug: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10).max(2000),
  featured: z.boolean().optional(),
  locales: z.array(eventLocaleSchema).max(2).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = createEventSchema.parse(await parseJson(request));
    return apiOk(
      await createPredictionEvent({
        ...payload,
        adminUserId: await requireAdminSessionUserId(),
      }),
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
