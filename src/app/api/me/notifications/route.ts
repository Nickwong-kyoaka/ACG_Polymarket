import { z } from "zod";
import { AppError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const preferenceSchema = z.object({
  followedContent: z.boolean().optional(),
  seriesUpdates: z.boolean().optional(),
  predictionChanges: z.boolean().optional(),
  predictionClosing: z.boolean().optional(),
  resolutions: z.boolean().optional(),
  moderationResults: z.boolean().optional(),
}).strict();

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("MARK_READ"), id: z.string().min(1) }),
  z.object({ action: z.literal("MARK_ALL_READ") }),
  z.object({ action: z.literal("PREFERENCES"), preferences: preferenceSchema }),
]);

export async function GET(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const params = new URL(request.url).searchParams;
    const limit = Math.min(50, Math.max(1, Number(params.get("limit") ?? 20) || 20));
    const cursor = params.get("cursor") ?? undefined;
    const [records, preferences] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        take: limit + 1,
      }),
      prisma.notificationPreference.findUnique({ where: { userId } }),
    ]);
    const hasMore = records.length > limit;
    const page = records.slice(0, limit);
    return apiOk({
      items: page.map((notification) => ({ ...notification, locale: notification.locale === "ZH_HANT" ? "zh-Hant" : notification.locale === "EN" ? "en" : null, createdAt: notification.createdAt.toISOString(), readAt: notification.readAt?.toISOString() ?? null })),
      nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
      unreadCount: await prisma.notification.count({ where: { userId, readAt: null } }),
      preferences: preferences ?? { followedContent: true, seriesUpdates: true, predictionChanges: true, predictionClosing: true, resolutions: true, moderationResults: true },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const [userId, input] = await Promise.all([requireSessionUserId(), parseJson(request).then((value) => actionSchema.parse(value))]);
    if (input.action === "MARK_READ") {
      const updated = await prisma.notification.updateMany({ where: { id: input.id, userId }, data: { readAt: new Date() } });
      if (!updated.count) throw new AppError("Notification not found.", 404, "NOT_FOUND");
      return apiOk({ read: true });
    }
    if (input.action === "MARK_ALL_READ") {
      const updated = await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
      return apiOk({ read: updated.count });
    }
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...input.preferences },
      update: input.preferences,
    });
    return apiOk({ preferences });
  } catch (error) {
    return handleApiError(error);
  }
}
