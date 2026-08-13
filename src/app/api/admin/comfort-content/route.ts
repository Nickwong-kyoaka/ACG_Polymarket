import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { adminComfortContentSchema } from "@/lib/schemas";
import { createAdminComfortContent } from "@/lib/store";
import { requireAdminSessionUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const payload = adminComfortContentSchema.parse(await parseJson(request));
    return apiOk({
      content: await createAdminComfortContent(payload, await requireAdminSessionUserId()),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
