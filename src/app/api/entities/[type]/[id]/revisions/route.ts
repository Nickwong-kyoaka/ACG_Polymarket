import { z } from "zod";
import { apiOk, handleApiError } from "@/lib/api";
import { listEntityRevisions, normalizeEntityType } from "@/lib/catalog-community";

const querySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).optional() });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  try {
    const [{ type, id }, url] = await Promise.all([params, Promise.resolve(new URL(request.url))]);
    const { limit } = querySchema.parse({ limit: url.searchParams.get("limit") ?? undefined });
    const entityType = normalizeEntityType(type);
    return apiOk({
      entityType,
      entityId: id,
      revisions: await listEntityRevisions(entityType, id, limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
