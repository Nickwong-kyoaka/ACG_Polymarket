import { z } from "zod";
import { apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { listMyEditProposals, submitEditProposal } from "@/lib/catalog-community";

const entityTypeSchema = z.enum(["SERIES", "CHARACTER", "PERSON", "EPISODE", "POST"]);
const statusSchema = z.enum(["DRAFT", "SUBMITTED", "NEEDS_CHANGES", "APPROVED", "REJECTED"]);
const createSchema = z.object({
  proposalId: z.string().trim().min(1).optional(),
  entityType: entityTypeSchema,
  entityId: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(8).max(2_000),
  changes: z
    .array(
      z.object({
        fieldKey: z.string().trim().min(1).max(100),
        newValue: z.unknown(),
        sourceUrl: z.string().trim().min(1),
      }),
    )
    .min(1)
    .max(20),
});
const listSchema = z.object({
  status: statusSchema.optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = listSchema.parse({
      status: url.searchParams.get("status") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    return apiOk(await listMyEditProposals(await requireSessionUserId(), query));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const [userId, payload] = await Promise.all([
      requireSessionUserId(),
      parseJson(request).then((value) => createSchema.parse(value)),
    ]);
    return apiOk({ proposal: await submitEditProposal(userId, payload) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
