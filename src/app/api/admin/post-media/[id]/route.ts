import { apiError, handleApiError } from "@/lib/api";
import { requireAdminSessionUserId } from "@/lib/auth";
import { isNormalizedPostMedia, readPrivatePostMedia } from "@/lib/media-intake";
import { prisma } from "@/lib/prisma";
import { isPublicAsset, renderPublicAsset } from "@/lib/public-assets";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSessionUserId();
    const { id } = await params;
    const media = await prisma.postMedia.findUnique({ where: { id }, include: { post: { select: { authorId: true } }, asset: { include: { derivatives: true } } } });
    if (!media || !["PENDING_REVIEW", "APPROVED"].includes(media.status)) return apiError("Normalized media not found.", 404);
    if (media.asset) {
      const rendered = isPublicAsset(media.asset) ? renderPublicAsset(media.asset) : null;
      if (!rendered) return apiError("Asset is not publishable.", 404);
      return new Response(null, { status: 302, headers: { Location: new URL(rendered.url, _request.url).href, "Cache-Control": "private, no-store" } });
    }
    if (!isNormalizedPostMedia(media, media.post.authorId)) return apiError("Normalized media not found.", 404);
    return new Response(new Uint8Array(await readPrivatePostMedia(media.storageKey!)), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return handleApiError(error); }
}
