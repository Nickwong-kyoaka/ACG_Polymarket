import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { comfortSessionSchema } from "@/lib/schemas";
import { createComfortSession } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = comfortSessionSchema.parse(await parseJson(request));
    return apiOk({ session: await createComfortSession(payload) });
  } catch (error) {
    return handleApiError(error);
  }
}
