import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import {
  lockPredictionMarket,
  openPredictionMarket,
  updatePredictionMarketRules,
} from "@/lib/prediction-market";

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

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("OPEN") }),
  z.object({ action: z.literal("LOCK") }),
  z.object({
    action: z.literal("UPDATE_RULES"),
    question: z.string().trim().min(5).max(300).optional(),
    description: z.string().trim().min(10).max(3000).optional(),
    edgeCaseRules: z.string().trim().min(10).max(3000).optional(),
    resolutionSourceUrl: z.string().url().max(2048).optional(),
    resolutionSourceLabel: z.string().trim().min(2).max(160).optional(),
    closesAt: z.coerce.date().optional(),
    timezone: z.string().trim().min(3).max(80).optional(),
    locales: z.array(localeSchema).max(2).optional(),
    oracleSources: z.array(sourceSchema).max(10).optional(),
  }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const payload = actionSchema.parse(await parseJson(request));
    const { identifier } = await params;
    const adminUserId = await requireAdminSessionUserId();
    if (payload.action === "OPEN") {
      return apiOk(await openPredictionMarket(identifier, adminUserId));
    }
    if (payload.action === "LOCK") {
      return apiOk(await lockPredictionMarket(identifier, adminUserId));
    }
    return apiOk(
      await updatePredictionMarketRules({
        identifier,
        adminUserId,
        question: payload.question,
        description: payload.description,
        edgeCaseRules: payload.edgeCaseRules,
        resolutionSourceUrl: payload.resolutionSourceUrl,
        resolutionSourceLabel: payload.resolutionSourceLabel,
        closesAt: payload.closesAt,
        timezone: payload.timezone,
        locales: payload.locales,
        oracleSources: payload.oracleSources,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
