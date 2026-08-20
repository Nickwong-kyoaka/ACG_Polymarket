import type { CharacterAsset } from "@/lib/types";

export type PublicCharacterAsset = Pick<
  CharacterAsset,
  "id" | "kind" | "label" | "altText" | "sourceKind" | "sourceUrl" | "sourceLabel" | "licenseName" | "publicUrl" | "storageKey"
> & { permissionBadge?: string };

const visualKinds = ["HERO", "CARD", "THUMB", "WALLPAPER"] as const;

export function publicAssetUrl(asset: Pick<CharacterAsset, "publicUrl" | "storageKey">) {
  if (asset.publicUrl?.startsWith("https://")) return asset.publicUrl;
  if (asset.storageKey.startsWith("assets/")) return `/${asset.storageKey}`;
  return undefined;
}

export function toPublicAsset(asset: CharacterAsset): PublicCharacterAsset | undefined {
  if (asset.workflowStatus !== "PUBLISHED") return undefined;
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
    .sort((left, right) => (priority.get(left.kind as typeof visualKinds[number]) ?? 99) - (priority.get(right.kind as typeof visualKinds[number]) ?? 99));
}

export function pageAllowsRealAds(assets: Array<Pick<CharacterAsset, "sourceKind" | "metadata">>) {
  return !assets.some((asset) => {
    const sourceKind = asset.sourceKind as string | undefined;
    return sourceKind === "OFFICIAL_REFERENCE" || sourceKind === "FAN_ART" || asset.metadata?.permissionState === "UNVERIFIED";
  });
}
