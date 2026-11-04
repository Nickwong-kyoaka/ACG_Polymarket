import { z } from "zod";
import { apiOk, handleApiError } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { listModerationReports } from "@/lib/report-moderation";

export async function GET(request: Request) {
  try {
    await requireAdminSessionUserId();
    const status = z.enum(["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"]).optional().parse(new URL(request.url).searchParams.get("status") ?? undefined);
    return apiOk({ reports: await listModerationReports(status) });
  } catch (error) { return handleApiError(error); }
}
