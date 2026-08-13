import { apiOk, handleApiError } from "@/lib/api";
import { getCharacterView } from "@/lib/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const { identifier } = await params;
    const locale = new URL(request.url).searchParams.get("locale") === "zh-Hant" ? "zh-Hant" : "en";
    return apiOk({ item: await getCharacterView(identifier, locale) });
  } catch (error) {
    return handleApiError(error);
  }
}
