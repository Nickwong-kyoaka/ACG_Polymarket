import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { reportSchema } from "@/lib/schemas";
import { createReport } from "@/lib/store";
import { requireSessionUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const payload = reportSchema.parse(await parseJson(request));
    return apiOk({
      report: await createReport({ ...payload, userId: await requireSessionUserId() }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
