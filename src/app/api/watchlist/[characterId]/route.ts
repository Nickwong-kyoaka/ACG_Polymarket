import { apiOk, handleApiError } from "@/lib/api";
import { toggleWatchlist } from "@/lib/store";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ characterId: string }> },
) {
  try {
    const { characterId } = await params;
    return apiOk(await toggleWatchlist(characterId));
  } catch (error) {
    return handleApiError(error);
  }
}
