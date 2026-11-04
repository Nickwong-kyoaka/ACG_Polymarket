import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { publicAssetWhere, renderPublicAsset } from "@/lib/public-assets";
import { pullLinkedPostMedia } from "@/lib/post-media";

type PublicMediaLocale = "en" | "zh-Hant";

function dbLocale(locale: PublicMediaLocale) {
  return locale === "zh-Hant" ? "ZH_HANT" as const : "EN" as const;
}

const publicAssetSelect = {
  id: true,
  kind: true,
  label: true,
  storageKey: true,
  publicUrl: true,
  altText: true,
  sourceLabel: true,
  sourceUrl: true,
  creatorName: true,
  creatorUrl: true,
  licenseName: true,
  licenseUrl: true,
  permissionStatus: true,
  sourceKind: true,
  primaryPriority: true,
  retrievedAt: true,
  locales: { select: { locale: true, altText: true, caption: true, attributionText: true } },
  derivatives: { select: { kind: true, publicUrl: true, width: true, height: true } },
} as const;

type PublicAssetRecord = Prisma.CharacterAssetGetPayload<{ select: typeof publicAssetSelect }>;

function assetDto(asset: PublicAssetRecord, locale: PublicMediaLocale) {
  if (!asset) return null;
  const media = renderPublicAsset(asset);
  if (!media) return null;
  const localized = asset.locales.find((entry) => entry.locale === dbLocale(locale));
  return {
    id: asset.id,
    kind: asset.kind,
    label: localized?.caption ?? asset.label,
    url: media.url,
    width: media.width,
    height: media.height,
    altText: localized?.altText ?? asset.altText,
    sourceLabel: asset.sourceLabel ?? asset.sourceKind.replaceAll("_", " "),
    sourceKind: asset.sourceKind,
    sourceUrl: asset.sourceUrl,
    creatorName: asset.creatorName,
    creatorUrl: asset.creatorUrl,
    licenseName: asset.licenseName,
    licenseUrl: asset.licenseUrl,
    permissionBadge: asset.permissionStatus,
    takedownUrl: `/sources?asset=${encodeURIComponent(asset.id)}`,
    retrievedAt: asset.retrievedAt?.toISOString() ?? null,
  };
}

export async function listPublicGallery(input: { locale?: PublicMediaLocale; character?: string; cursor?: string; limit?: number } = {}) {
  const locale = input.locale ?? "en";
  const limit = Math.min(Math.max(input.limit ?? 24, 1), 48);
  const records = await prisma.character.findMany({
    where: { publishStatus: "PUBLISHED", ...(input.character ? { OR: [{ id: input.character }, { slug: input.character }] } : {}) },
    orderBy: [{ isFeatured: "desc" }, { slug: "asc" }],
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    select: {
      id: true, slug: true, name: true, title: true, accentFrom: true, accentTo: true,
      locales: { select: { locale: true, name: true, title: true } },
      assets: { where: publicAssetWhere, orderBy: [{ primaryPriority: "desc" }, { publishedAt: "desc" }], select: publicAssetSelect },
    },
  });
  const hasMore = records.length > limit;
  const page = records.slice(0, limit);
  return {
    items: page.map((record) => {
      const localized = record.locales.find((entry) => entry.locale === dbLocale(locale));
      const assets = record.assets.flatMap((asset) => { const dto = assetDto(asset, locale); return dto ? [dto] : []; });
      return { character: { id: record.id, slug: record.slug, name: localized?.name ?? record.name, title: localized?.title ?? record.title, accentFrom: record.accentFrom, accentTo: record.accentTo }, assets, realAdsAllowed: assets.every((asset) => asset.permissionBadge === "VERIFIED" || asset.permissionBadge === "CREATOR_GRANTED") };
    }),
    nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
  };
}

export async function listPublicSources(locale: PublicMediaLocale = "en") {
  const gallery = await listPublicGallery({ locale, limit: 48 });
  return gallery.items.flatMap((entry) => entry.assets.map((asset) => ({ ...asset, character: entry.character, realAdsAllowed: entry.realAdsAllowed })));
}

export async function submitTakedown(input: { assetId: string; requesterUserId?: string; requesterName?: string; requesterEmail: string; reason: string; evidenceUrl?: string }) {
  const asset = await prisma.characterAsset.findUnique({ where: { id: input.assetId }, select: { id: true, permissionStatus: true, workflowStatus: true } });
  if (!asset || asset.workflowStatus === "PULLED") throw new AppError("Published asset not found.", 404, "ASSET_NOT_FOUND");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (await prisma.takedownRequest.count({ where: { requesterEmail: input.requesterEmail.toLowerCase(), createdAt: { gte: since } } }) >= 5) throw new AppError("Too many takedown requests. Please wait before retrying.", 429, "RATE_LIMITED");
  return prisma.$transaction(async (tx) => {
    const request = await tx.takedownRequest.create({ data: { assetId: asset.id, requesterUserId: input.requesterUserId, requesterName: input.requesterName, requesterEmail: input.requesterEmail.toLowerCase(), reason: input.reason, evidenceUrl: input.evidenceUrl } });
    const immediatelyPulled = asset.permissionStatus === "UNVERIFIED";
    if (immediatelyPulled) {
      await tx.characterAsset.update({ where: { id: asset.id }, data: { permissionStatus: "TAKEDOWN_REQUESTED", workflowStatus: "PULLED", publishedAt: null } });
      await pullLinkedPostMedia(tx, asset.id);
    }
    await tx.assetAuditLog.create({ data: { assetId: asset.id, actorUserId: input.requesterUserId, action: "TAKEDOWN_REQUESTED", detail: { requestId: request.id, immediatelyPulled } } });
    return { id: request.id, status: request.status, immediatelyPulled };
  });
}
