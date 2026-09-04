import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { createPredictionMarket } from "@/lib/prediction-market";

const localeSchema = z.object({
  locale: z.enum(["en", "zh-Hant"]),
  question: z.string().trim().min(5).max(300),
  description: z.string().trim().min(10).max(3000),
  edgeCaseRules: z.string().trim().min(10).max(3000),
});

const sourceSchema = z.object({
  label: z.string().trim().min(2).max(160),
  url: z.string().url().max(2048),
  priority: z.number().int().min(0).max(100).optional(),
});

const createMarketSchema = z.object({
  eventId: z.string().min(1),
  slug: z.string().trim().min(2).max(100),
  question: z.string().trim().min(5).max(300),
  description: z.string().trim().min(10).max(3000),
  resolutionSourceUrl: z.string().url().max(2048),
  resolutionSourceLabel: z.string().trim().min(2).max(160),
  edgeCaseRules: z.string().trim().min(10).max(3000),
  closesAt: z.coerce.date(),
  timezone: z.string().trim().min(3).max(80).optional(),
  locales: z.array(localeSchema).max(2).optional(),
  oracleSources: z.array(sourceSchema).max(10).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = createMarketSchema.parse(await parseJson(request));
    return apiOk(
      await createPredictionMarket({
        ...payload,
        adminUserId: await requireAdminSessionUserId(),
      }),
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
