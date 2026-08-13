import { apiOk, handleApiError } from "@/lib/api";
import { toggleWatchlist } from "@/lib/store";
import { requireSessionUserId } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ characterId: string }> },
) {
  try {
    const { characterId } = await params;
    return apiOk(await toggleWatchlist(characterId, await requireSessionUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}
