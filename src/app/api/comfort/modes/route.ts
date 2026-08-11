import { apiOk, handleApiError } from "@/lib/api";
import { listComfortModes } from "@/lib/store";

export async function GET() {
  try {
    return apiOk({ modes: await listComfortModes() });
  } catch (error) {
    return handleApiError(error);
  }
}
