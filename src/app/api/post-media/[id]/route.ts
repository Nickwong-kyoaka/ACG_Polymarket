import { apiError, handleApiError } from "@/lib/api";
import { isNormalizedPostMedia, readPrivatePostMedia } from "@/lib/media-intake";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/.test(id)) return apiError("Media not found.", 404);
    const media = await prisma.postMedia.findFirst({
      where: { storageKey: { endsWith: `/${id}.webp` }, assetId: null, status: "APPROVED", post: { is: { status: "PUBLISHED", publishedAt: { not: null } } } },
      select: { storageKey: true, publicUrl: true, post: { select: { authorId: true } } },
    });
    if (!media?.storageKey || !isNormalizedPostMedia(media, media.post.authorId)) return apiError("Media not found.", 404);
    const bytes = await readPrivatePostMedia(media.storageKey);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return handleApiError(error); }
}
