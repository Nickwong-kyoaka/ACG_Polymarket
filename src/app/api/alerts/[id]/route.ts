import { requireSessionUserId } from "@/lib/auth";
import { apiOk, handleApiError } from "@/lib/api";
import { deleteMarketAlert } from "@/lib/market-alerts";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return apiOk(await deleteMarketAlert(await requireSessionUserId(), id));
  } catch (error) {
    return handleApiError(error);
  }
}
