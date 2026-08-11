import { apiOk, handleApiError } from "@/lib/api";
import { getCharacterView } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const { identifier } = await params;
    return apiOk({ item: await getCharacterView(identifier) });
  } catch (error) {
    return handleApiError(error);
  }
}
