import { z } from "zod";
import { apiOk, handleApiError } from "@/lib/api";
import { getOptionalSessionUserId } from "@/lib/auth";
import { getCatalogCalendar } from "@/lib/catalog-community";

const querySchema = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  locale: z.enum(["en", "zh-Hant", "cn"]).optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = querySchema.parse({
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      locale: url.searchParams.get("locale") ?? undefined,
    });
    const from = query.from ? new Date(query.from) : new Date();
    const to = query.to ? new Date(query.to) : new Date(from.getTime() + 14 * 24 * 60 * 60 * 1_000);
    return apiOk({
      calendar: await getCatalogCalendar({
        from,
        to,
        locale: query.locale,
        userId: await getOptionalSessionUserId(),
      }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
