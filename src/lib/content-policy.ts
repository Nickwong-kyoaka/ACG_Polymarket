import type { AssetSourceKind, ExternalScoreSnapshot } from "@/lib/types";

export function validateBangumiAttribution(input: {
  importedText?: string;
  licenseName?: string;
  attributionText?: string;
  sourceUrl?: string;
}) {
  if (input.importedText && (!input.licenseName || !input.attributionText || !input.sourceUrl)) {
    throw new Error("Imported Bangumi text requires source, license, and attribution details.");
  }
}

export function validateAssetSource(input: {
  workflowStatus: string;
  rightsGrantId?: string;
  sourceKind?: AssetSourceKind;
  sourceUrl?: string;
  attributionText?: string;
  takedownContact?: string;
}) {
  if (input.workflowStatus === "PUBLISHED" && !input.rightsGrantId) {
    throw new Error("Published assets require a linked rights grant.");
  }

  if (input.sourceKind === "BANGUMI_METADATA" && (!input.sourceUrl || !input.attributionText)) {
    throw new Error("Bangumi metadata assets require source URL and attribution text.");
  }

  if (input.sourceKind === "OFFICIAL_REFERENCE" && !input.takedownContact) {
    throw new Error("Official-reference assets require a takedown contact before publish.");
  }
}

export function normalizeExternalScore(input: ExternalScoreSnapshot): ExternalScoreSnapshot {
  const normalizedScore =
    typeof input.score === "number" ? Math.max(0, Math.min(100, Math.round(input.score))) : undefined;

  return {
    ...input,
    score: normalizedScore,
    rank: input.rank && input.rank > 0 ? Math.round(input.rank) : input.rank,
    popularity:
      input.popularity && input.popularity > 0 ? Math.round(input.popularity) : input.popularity,
    favorites: input.favorites && input.favorites > 0 ? Math.round(input.favorites) : input.favorites,
  };
}
