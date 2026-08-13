import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { importRemoteCharacterMedia } from "@/lib/media-intake";

const schema = z.object({ characterId: z.string().min(1), directMediaUrl: z.url().startsWith("https://"), sourcePageUrl: z.url().startsWith("https://"), sourceKind: z.enum(["FAN_ART", "OPEN_LICENSE", "OFFICIAL_REFERENCE", "USER_PROVIDED"]), permissionStatus: z.enum(["VERIFIED", "CREATOR_GRANTED", "UNVERIFIED"]), creatorName: z.string().trim().max(160).optional(), creatorUrl: z.url().startsWith("https://").optional(), licenseName: z.string().trim().max(120).optional(), licenseUrl: z.url().startsWith("https://").optional(), permissionEvidence: z.string().trim().max(2000).optional(), label: z.string().trim().min(2).max(160), altTextEn: z.string().trim().min(8).max(500), altTextZhHant: z.string().trim().min(4).max(500), riskAcknowledged: z.boolean() });

export const runtime = "nodejs";
export async function POST(request: Request) {
  try { return apiOk({ asset: await importRemoteCharacterMedia({ ...schema.parse(await parseJson(request)), adminUserId: await requireAdminSessionUserId() }) }, 201); }
  catch (error) { return handleApiError(error); }
}
