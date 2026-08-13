import { apiOk, handleApiError } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { reconcileMarket } from "@/lib/market-reconciliation";

export async function GET() {
  try { await requireAdminSessionUserId(); return apiOk(await reconcileMarket()); }
  catch (error) { return handleApiError(error); }
}
