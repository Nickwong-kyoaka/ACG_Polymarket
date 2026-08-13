import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { getOptionalSessionUserId } from "@/lib/auth";
import { submitTakedown } from "@/lib/public-media";

const schema = z.object({ assetId: z.string().min(1), requesterName: z.string().trim().max(120).optional(), requesterEmail: z.email(), reason: z.string().trim().min(20).max(2000), evidenceUrl: z.url().startsWith("https://"), goodFaith: z.literal("true") });

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await parseJson(request));
    return apiOk(await submitTakedown({ ...payload, requesterUserId: await getOptionalSessionUserId() }), 201);
  } catch (error) { return handleApiError(error); }
}
