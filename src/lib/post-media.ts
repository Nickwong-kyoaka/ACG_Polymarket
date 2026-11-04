import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/api";
import { importRemotePostMedia, isNormalizedPostMedia } from "@/lib/media-intake";
import { prisma } from "@/lib/prisma";
import { publicAssetWhere, renderPublicAsset } from "@/lib/public-assets";

export type PostMediaInput = {
  assetId?: string;
  publicUrl?: string;
  storageKey?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  altText?: string;
};

// Call once before the serializable write, never inside its retry callback.
// Only this pipeline may mint storage keys; there is no upload-receipt API yet.
export async function preparePostMedia<T extends PostMediaInput>(media: T[], userId: string): Promise<T[]> {
  if (media.length > 9) throw new AppError("At most nine media items are allowed.", 422, "INVALID_MEDIA");
  const result: T[] = [];
  for (const entry of media) {
    if ("status" in entry || "reviewedAt" in entry || "reviewedById" in entry) {
      throw new AppError("Media review fields are server-controlled.", 422, "INVALID_MEDIA");
    }
    if (entry.assetId) {
      if (entry.publicUrl || entry.storageKey || entry.sourceUrl || entry.sourceLabel) {
        throw new AppError("Asset references inherit their source and storage fields.", 422, "INVALID_MEDIA");
      }
      const asset = await prisma.characterAsset.findFirst({
        where: { id: entry.assetId, ...publicAssetWhere },
        include: { derivatives: true },
      });
      if (!asset || !renderPublicAsset(asset)) throw new AppError("Asset is not publishable.", 422, "MEDIA_NOT_PUBLISHABLE");
      result.push({ ...entry });
      continue;
    }
    if (entry.storageKey !== undefined) throw new AppError("Untrusted storage keys are not accepted. Submit an HTTPS image URL.", 422, "UNTRUSTED_STORAGE_KEY");
    let url: URL;
    try { url = new URL(entry.publicUrl ?? ""); }
    catch { throw new AppError("Media requires a valid HTTPS image URL.", 422, "MEDIA_SOURCE_REQUIRED"); }
    if (url.protocol !== "https:" || url.username || url.password) throw new AppError("Media requires a valid HTTPS image URL.", 422, "MEDIA_SOURCE_REQUIRED");
    if (/^\/api\/post-media\/[a-f0-9-]{36}$/.test(url.pathname)) {
      const retained = await prisma.postMedia.findFirst({
        where: { publicUrl: entry.publicUrl, assetId: null, status: { in: ["PENDING_REVIEW", "APPROVED"] }, post: { is: { authorId: userId, status: { not: "REMOVED" } } } },
        select: { publicUrl: true, storageKey: true, sourceUrl: true, sourceLabel: true, altText: true, status: true, post: { select: { authorId: true, status: true } } },
      });
      if (!retained || retained.publicUrl !== entry.publicUrl || retained.post.authorId !== userId || retained.post.status === "REMOVED" || !["PENDING_REVIEW", "APPROVED"].includes(retained.status) || !isNormalizedPostMedia(retained, userId)) {
        throw new AppError("Retained media must belong to your own active normalized upload.", 422, "MEDIA_NOT_OWNED");
      }
      const altText = entry.altText?.trim() || retained.altText.trim();
      if (!retained.sourceUrl?.startsWith("https://") || !retained.sourceLabel?.trim() || !altText) {
        throw new AppError("Retained media is missing its stored provenance.", 422, "MEDIA_SOURCE_REQUIRED");
      }
      // Pending objects are deliberately inaccessible to the public fetch route.
      // Reuse only database-minted storage/provenance, never client review state.
      result.push({ ...entry, publicUrl: retained.publicUrl!, storageKey: retained.storageKey!, sourceUrl: retained.sourceUrl, sourceLabel: retained.sourceLabel, altText });
      continue;
    }
    if (!entry.altText?.trim() || !entry.sourceLabel?.trim() || !entry.sourceUrl?.startsWith("https://")) {
      throw new AppError("New imagery requires an HTTPS image and source URL, source label, and alt text.", 422, "MEDIA_SOURCE_REQUIRED");
    }
    const normalized = await importRemotePostMedia(entry.publicUrl!, userId);
    result.push({ ...entry, ...normalized });
  }
  return result;
}

// Pull the relationship too, even if an older renderer copied the asset's URL.
export async function pullLinkedPostMedia(tx: Prisma.TransactionClient, assetId: string) {
  return tx.postMedia.updateMany({ where: { assetId, status: { not: "PULLED" } }, data: { status: "PULLED" } });
}
