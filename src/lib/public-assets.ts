import type { CharacterAsset } from "@/lib/types";
import type { Prisma } from "@prisma/client";

export const publicAssetWhere = {
  workflowStatus: "PUBLISHED" as const,
  contentRating: "SFW" as const,
  permissionStatus: { notIn: ["REJECTED", "TAKEDOWN_REQUESTED"] },
} satisfies Prisma.CharacterAssetWhereInput;

export function isPublicAsset(asset: { workflowStatus?: string; permissionStatus?: string | null; contentRating?: string | null }) {
  return asset.workflowStatus === "PUBLISHED" &&
    !["REJECTED", "TAKEDOWN_REQUESTED"].includes(asset.permissionStatus ?? "") &&
    (asset.contentRating === undefined || asset.contentRating === "SFW");
}

export function safePublicMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\/assets\/[A-Za-z0-9_/-]+(?:\.[A-Za-z0-9]+)?$/.test(value) && !value.includes("..")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function renderPublicAsset(asset: {
  publicUrl: string | null;
  storageKey: string;
  derivatives?: Array<{ kind: string; publicUrl: string; width?: number; height?: number }>;
}) {
  const derivatives = asset.derivatives ?? [];
  const ordered = [
    ...derivatives.filter((item) => item.kind === "CARD"),
    ...derivatives.filter((item) => item.kind === "HERO"),
    ...derivatives,
  ];
  for (const item of ordered) {
    const url = safePublicMediaUrl(item.publicUrl);
    if (url) return { url, width: item.width ?? null, height: item.height ?? null };
  }
  const url = safePublicMediaUrl(asset.publicUrl) ?? safePublicMediaUrl(`/${asset.storageKey}`);
  return url ? { url, width: null, height: null } : null;
}

// A linked asset must never fall back to a stale, copied PostMedia URL.
export const publicPostMediaWhere = {
  status: "APPROVED" as const,
  OR: [{ assetId: null }, { asset: { is: publicAssetWhere } }],
} satisfies Prisma.PostMediaWhereInput;

export function renderPublicPostMedia(media: {
  status?: string;
  assetId?: string | null;
  publicUrl: string | null;
  storageKey: string | null;
  asset?: (Parameters<typeof renderPublicAsset>[0] & Parameters<typeof isPublicAsset>[0]) | null;
}) {
  if (media.status !== "APPROVED") return null;
  if (media.assetId || media.asset) {
    return media.asset && isPublicAsset(media.asset) ? renderPublicAsset(media.asset) : null;
  }
  const url = safePublicMediaUrl(media.publicUrl) ?? safePublicMediaUrl(media.storageKey ? `/${media.storageKey}` : null);
  return url ? { url, width: null, height: null } : null;
}

export type PublicCharacterAsset = Pick<
  CharacterAsset,
  "id" | "kind" | "label" | "altText" | "sourceKind" | "sourceUrl" | "sourceLabel" | "licenseName" | "publicUrl" | "storageKey" | "primaryPriority"
> & { permissionBadge?: string };

const visualKinds = ["HERO", "CARD", "THUMB", "WALLPAPER"] as const;

export function publicAssetUrl(asset: Pick<CharacterAsset, "publicUrl" | "storageKey">) {
  return safePublicMediaUrl(asset.publicUrl) ?? safePublicMediaUrl(`/${asset.storageKey}`) ?? undefined;
}

export function toPublicAsset(asset: CharacterAsset): PublicCharacterAsset | undefined {
  if (!isPublicAsset(asset)) return undefined;
  const renderedUrl = publicAssetUrl(asset);
  if (!renderedUrl) return undefined;
  return {
    id: asset.id,
    kind: asset.kind,
    label: asset.label,
    altText: asset.altText,
    sourceKind: asset.sourceKind,
    sourceUrl: asset.sourceUrl,
    sourceLabel: asset.sourceLabel,
    licenseName: asset.licenseName,
    publicUrl: renderedUrl,
    storageKey: asset.storageKey,
    primaryPriority: asset.primaryPriority,
    permissionBadge: asset.permissionStatus ?? (asset.sourceKind === "AI_GENERATED" ? "AI GENERATED" : asset.sourceKind?.replaceAll("_", " ")),
  };
}

export function publishedVisuals(assets: CharacterAsset[]) {
  const priority = new Map(visualKinds.map((kind, index) => [kind, index]));
  return assets
    .flatMap((asset) => {
      const publicAsset = toPublicAsset(asset);
      return publicAsset && priority.has(asset.kind as typeof visualKinds[number]) ? [publicAsset] : [];
    })
    .sort((left, right) => {
      const kindOrder = (priority.get(left.kind as typeof visualKinds[number]) ?? 99) - (priority.get(right.kind as typeof visualKinds[number]) ?? 99);
      return kindOrder || (right.primaryPriority ?? 0) - (left.primaryPriority ?? 0);
    });
}

export function pageAllowsRealAds(assets: Array<Pick<CharacterAsset, "sourceKind" | "metadata">>) {
  return !assets.some((asset) => {
    const sourceKind = asset.sourceKind as string | undefined;
    return sourceKind === "OFFICIAL_REFERENCE" || sourceKind === "FAN_ART" || asset.metadata?.permissionState === "UNVERIFIED";
  });
}
