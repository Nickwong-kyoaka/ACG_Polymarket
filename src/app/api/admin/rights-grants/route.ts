import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ seriesId: z.string().optional(), characterId: z.string().optional(), licensor: z.string().trim().min(2), contractReference: z.string().trim().min(2), territories: z.array(z.string().min(1)).min(1), salesChannels: z.array(z.string().min(1)).min(1), allowedUseTypes: z.array(z.string().min(1)).min(1), attributionText: z.string().trim().min(3), takedownContact: z.string().trim().min(3), embargoAt: z.string().datetime().optional(), expiresAt: z.string().datetime().optional(), commercialUse: z.boolean() }).refine((value) => Boolean(value.seriesId || value.characterId), { message: "A series or character is required." });

export async function POST(request: Request) {
  try { await requireAdminSessionUserId(); const payload = schema.parse(await parseJson(request)); const grant = await prisma.rightsGrant.create({ data: { ...payload, embargoAt: payload.embargoAt ? new Date(payload.embargoAt) : undefined, expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined } }); return apiOk({ grant }, 201); }
  catch (error) { return handleApiError(error); }
}
