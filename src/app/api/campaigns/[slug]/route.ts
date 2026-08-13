import { getOptionalSessionUserId } from "@/lib/auth";
import { apiOk, handleApiError } from "@/lib/api";
import { getSupportCampaign } from "@/lib/support-campaigns";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const locale = new URL(request.url).searchParams.get("locale") === "zh-Hant" ? "zh-Hant" : "en";
    return apiOk(await getSupportCampaign(slug, locale, await getOptionalSessionUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}
