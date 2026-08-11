import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { adminComfortContentSchema } from "@/lib/schemas";
import { createAdminComfortContent } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = adminComfortContentSchema.parse(await parseJson(request));
    return apiOk({
      content: await createAdminComfortContent(payload, payload.userId),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
