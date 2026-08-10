export type AssetSourceType =
  | "AI_GENERATED"
  | "USER_PROVIDED"
  | "BANGUMI_METADATA"
  | "OFFICIAL_REFERENCE";

export interface AssetSourceValidationInput {
  sourceType: AssetSourceType;
  workflowStatus?: "UPLOADED" | "NORMALIZED" | "TAGGED" | "RIGHTS_CHECKED" | "REVIEWED" | "PUBLISHED" | "PULLED";
  sourceLabel?: string;
  sourceUrl?: string;
  licenseName?: string;
  attributionText?: string;
  takedownContact?: string;
  rightsGrantId?: string;
  aiPrompt?: string;
  aiModel?: string;
}

export interface AssetSourceValidationResult {
  ok: boolean;
  publishable: boolean;
  errors: string[];
}

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

export function validateAssetSource(input: AssetSourceValidationInput): AssetSourceValidationResult {
  const errors: string[] = [];
  const wantsPublish = input.workflowStatus === "PUBLISHED";

  if (!hasValue(input.sourceLabel)) {
    errors.push("Asset source label is required.");
  }

  if (input.sourceType === "AI_GENERATED" && !hasValue(input.aiPrompt) && !hasValue(input.aiModel)) {
    errors.push("AI-generated assets require prompt or model provenance.");
  }

  if (input.sourceType === "USER_PROVIDED" && wantsPublish && !hasValue(input.takedownContact)) {
    errors.push("Published user-provided assets require a takedown contact.");
  }

  if (input.sourceType === "BANGUMI_METADATA") {
    if (!hasValue(input.sourceUrl)) {
      errors.push("Bangumi metadata requires a source URL.");
    }

    if (!hasValue(input.licenseName) || !hasValue(input.attributionText)) {
      errors.push("Bangumi metadata requires license and attribution text.");
    }
  }

  if (input.sourceType === "OFFICIAL_REFERENCE" && wantsPublish && !hasValue(input.rightsGrantId)) {
    errors.push("Official reference assets cannot be published without a rights grant.");
  }

  return {
    ok: errors.length === 0,
    publishable: wantsPublish && errors.length === 0,
    errors,
  };
}
