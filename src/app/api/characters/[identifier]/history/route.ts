import { apiOk, handleApiError } from "@/lib/api";
import { getCharacterHistory } from "@/lib/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const { identifier } = await params;
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 60);
    return apiOk({ history: await getCharacterHistory(identifier, limit) });
  } catch (error) {
    return handleApiError(error);
  }
}
