import { z } from "zod";
import { AppError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { getOptionalSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const eventNames = [
  "PAGE_VIEW",
  "ONBOARDING_STARTED",
  "ONBOARDING_COMPLETED",
  "FOLLOW",
  "SAVE",
  "POST_SUBMITTED",
  "SUPPORT_QUOTE",
  "SUPPORT_TRADE",
  "PREDICTION_QUOTE",
  "PREDICTION_TRADE",
  "SHARE",
] as const;

const scalar = z.union([z.string().max(240), z.number().finite(), z.boolean(), z.null()]);
const analyticsSchema = z.object({
  name: z.enum(eventNames),
  sessionKey: z.string().min(16).max(128).optional(),
  locale: z.enum(["en", "zh-Hant"]).optional(),
  path: z.string().startsWith("/").max(500).optional(),
  source: z.string().max(120).optional(),
  metadata: z.record(z.string().max(80), scalar).optional(),
}).strict();

export async function POST(request: Request) {
  try {
    const [input, userId] = await Promise.all([
      parseJson(request).then((value) => analyticsSchema.parse(value)),
      getOptionalSessionUserId(),
    ]);
    if (!userId && !input.sessionKey) throw new AppError("Anonymous events need a session key.", 422, "SESSION_KEY_REQUIRED");
    const recent = await prisma.analyticsEvent.count({
      where: {
        ...(userId ? { userId } : { sessionKey: input.sessionKey }),
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recent >= 60) throw new AppError("Analytics event rate limit reached.", 429, "RATE_LIMITED");
    await prisma.analyticsEvent.create({
      data: {
        userId,
        sessionKey: input.sessionKey,
        name: input.name,
        locale: input.locale === "zh-Hant" ? "ZH_HANT" : input.locale === "en" ? "EN" : undefined,
        path: input.path,
        source: input.source,
        referrer: request.headers.get("referer")?.slice(0, 1000),
        metadata: input.metadata,
      },
      select: { id: true },
    });
    return apiOk({ accepted: true }, 202);
  } catch (error) {
    return handleApiError(error);
  }
}
