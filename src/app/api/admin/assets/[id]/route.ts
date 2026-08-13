import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const httpsUrl = z.url().startsWith("https://");
const schema = z.object({ label: z.string().trim().min(2).max(160).optional(), altTextEn: z.string().trim().min(8).max(500).optional(), altTextZhHant: z.string().trim().min(4).max(500).optional(), sourceKind: z.enum(["PLATFORM_ORIGINAL", "AI_GENERATED", "USER_PROVIDED", "FAN_ART", "OPEN_LICENSE", "BANGUMI_METADATA", "OFFICIAL_REFERENCE"]).optional(), permissionStatus: z.enum(["VERIFIED", "CREATOR_GRANTED", "UNVERIFIED", "REJECTED", "TAKEDOWN_REQUESTED"]).optional(), contentRating: z.enum(["UNRATED", "SFW", "SUGGESTIVE", "NSFW"]).optional(), sourceUrl: httpsUrl.optional(), sourceLabel: z.string().trim().min(2).max(160).optional(), creatorName: z.string().trim().min(2).max(160).optional(), creatorUrl: httpsUrl.optional(), licenseName: z.string().trim().min(2).max(120).optional(), licenseUrl: httpsUrl.optional(), permissionEvidence: z.string().trim().min(3).max(4000).optional(), attributionText: z.string().trim().min(3).max(2000).optional(), takedownContact: z.string().trim().min(3).max(240).optional(), riskAcknowledged: z.boolean().optional(), primaryPriority: z.number().int().min(0).max(1000).optional() }).refine((value) => (value.altTextEn === undefined) === (value.altTextZhHant === undefined), { message: "Update English and Traditional Chinese alt text together." });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const [payload, { id }, adminUserId] = await Promise.all([parseJson(request).then((value) => schema.parse(value)), params, requireAdminSessionUserId()]);
    const { altTextEn, altTextZhHant, riskAcknowledged, ...data } = payload;
    const asset = await prisma.characterAsset.update({ where: { id }, data: { ...data, ...(altTextEn ? { altText: altTextEn } : {}), ...(riskAcknowledged ? { riskAcknowledgedById: adminUserId, riskAcknowledgedAt: new Date() } : {}), ...(altTextEn && altTextZhHant ? { locales: { upsert: [{ where: { assetId_locale: { assetId: id, locale: "EN" } }, create: { locale: "EN", altText: altTextEn }, update: { altText: altTextEn } }, { where: { assetId_locale: { assetId: id, locale: "ZH_HANT" } }, create: { locale: "ZH_HANT", altText: altTextZhHant }, update: { altText: altTextZhHant } }] } } : {}), auditLogs: { create: { actorUserId: adminUserId, action: "METADATA_UPDATED", detail: { fields: Object.keys(payload) } } } }, select: { id: true, label: true, workflowStatus: true, permissionStatus: true, contentRating: true, sourceUrl: true, primaryPriority: true } });
    return apiOk({ asset });
  } catch (error) { return handleApiError(error); }
}
