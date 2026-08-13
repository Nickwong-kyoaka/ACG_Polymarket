import type { AssetPermissionStatus, AssetSourceKind, ContentRating, ExternalScoreSnapshot } from "@/lib/types";
import { AppError } from "@/lib/api";

function policyError(message: string, code: string) {
  return new AppError(message, 422, code);
}

export function validateBangumiAttribution(input: {
  importedText?: string;
  licenseName?: string;
  attributionText?: string;
  sourceUrl?: string;
}) {
  if (input.importedText && (!input.licenseName || !input.attributionText || !input.sourceUrl)) {
    throw policyError("Imported Bangumi text requires source, license, and attribution details.", "ATTRIBUTION_INCOMPLETE");
  }
}

export function validateAssetSource(input: {
  workflowStatus: string;
  rightsGrantId?: string;
  sourceKind?: AssetSourceKind;
  sourceUrl?: string;
  attributionText?: string;
  takedownContact?: string;
  sourceLabel?: string;
  aiPrompt?: string;
  aiModel?: string;
  permissionStatus?: AssetPermissionStatus;
  contentRating?: ContentRating;
  riskAcknowledgedAt?: string | Date | null;
  licenseName?: string;
  licenseUrl?: string;
}) {
  if (input.sourceKind === "BANGUMI_METADATA" && (!input.sourceUrl || !input.attributionText)) {
    throw policyError("Bangumi metadata assets require source URL and attribution text.", "ASSET_SOURCE_INCOMPLETE");
  }

  const external = input.sourceKind && ["USER_PROVIDED", "FAN_ART", "OPEN_LICENSE", "OFFICIAL_REFERENCE"].includes(input.sourceKind);
  if (input.workflowStatus === "PUBLISHED" && external && (!input.sourceUrl || !input.sourceLabel || !input.takedownContact)) {
    throw policyError("Published external media requires a source URL, visible source label, and takedown contact.", "ASSET_SOURCE_INCOMPLETE");
  }

  if (input.workflowStatus === "PUBLISHED" && input.sourceKind === "AI_GENERATED" && (!input.aiPrompt || !input.aiModel)) {
    throw policyError("Published AI-generated assets require prompt and model provenance.", "AI_PROVENANCE_INCOMPLETE");
  }

  if (input.workflowStatus === "PUBLISHED" && input.sourceKind === "USER_PROVIDED" && (!input.attributionText || !input.takedownContact)) {
    throw policyError("Published user-provided assets require attribution and a takedown contact.", "ASSET_SOURCE_INCOMPLETE");
  }
  if (input.workflowStatus === "PUBLISHED") {
    if (input.contentRating !== "SFW") throw policyError("Only reviewed SFW media can be published.", "ASSET_NOT_SFW");
    if (!input.permissionStatus || ["REJECTED", "TAKEDOWN_REQUESTED"].includes(input.permissionStatus)) throw policyError("Rejected or takedown-requested media cannot be published.", "ASSET_PERMISSION_REJECTED");
    if (input.permissionStatus === "UNVERIFIED" && !input.riskAcknowledgedAt) throw policyError("Unverified media requires an administrator risk acknowledgement.", "ASSET_RISK_NOT_ACKNOWLEDGED");
    if (input.sourceKind === "PLATFORM_ORIGINAL" && !input.rightsGrantId) throw policyError("Platform-original media requires its rights grant.", "ASSET_RIGHTS_MISSING");
    if (input.sourceKind === "OPEN_LICENSE" && (!input.licenseName || !input.licenseUrl)) throw policyError("Open-license media requires the license name and URL.", "ASSET_LICENSE_INCOMPLETE");
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
