import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { adminCharacterSchema } from "@/lib/schemas";
import { createAdminCharacter } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = adminCharacterSchema.parse(await parseJson(request));
    return apiOk({ character: createAdminCharacter(payload) });
  } catch (error) {
    return handleApiError(error);
  }
}
