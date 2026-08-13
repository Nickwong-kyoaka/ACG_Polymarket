import { z } from "zod";
import { apiOk, AppError, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
  goalUnits: z.number().int().min(1).max(10_000_000).optional(),
  endsAt: z.iso.datetime().nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one campaign change.");

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSessionUserId();
    const [{ id }, payload] = await Promise.all([
      params,
      parseJson(request).then((value) => schema.parse(value)),
    ]);
    const current = await prisma.supportCampaign.findUnique({ where: { id } });
    if (!current) throw new AppError("Support campaign not found.", 404, "CAMPAIGN_NOT_FOUND");
    if (payload.goalUnits !== undefined && payload.goalUnits < current.currentUnits) {
      throw new AppError("The goal cannot be lower than current community support.", 422, "CAMPAIGN_GOAL_TOO_LOW");
    }
    const campaign = await prisma.supportCampaign.update({
      where: { id },
      data: {
        status: payload.status,
        goalUnits: payload.goalUnits,
        endsAt: payload.endsAt === undefined ? undefined : payload.endsAt ? new Date(payload.endsAt) : null,
      },
      select: { id: true, slug: true, status: true, goalUnits: true, currentUnits: true, endsAt: true },
    });
    return apiOk({ campaign: { ...campaign, endsAt: campaign.endsAt?.toISOString() ?? null } });
  } catch (error) {
    return handleApiError(error);
  }
}
