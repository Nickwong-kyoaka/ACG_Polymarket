import manifestJson from "../../content/approved-media.json";

export type ApprovedMediaDecision = "PUBLISH_UNVERIFIED" | "REVIEW_ONLY";

export interface ApprovedMediaEntry {
  candidateId: string;
  characterSlug: string;
  sourceKind: "OFFICIAL_REFERENCE";
  sourcePageUrl: string;
  sourceMediaUrl: string;
  creatorName: string;
  creatorUrl: string;
  licenseName: string | null;
  licenseUrl: string | null;
  permissionStatus: "UNVERIFIED";
  approvalStatus: "APPROVED";
  sfwReview: "SAFE";
  adEligible: false;
  retrievedAt: string;
  sourceSha256: string;
  normalizedSha256: string;
  width: number;
  height: number;
  byteSize: number;
  altText: { en: string; "zh-Hant": string };
  publicationDecision: ApprovedMediaDecision;
  decisionReason: string;
}

export interface ApprovedMediaManifest {
  schemaVersion: number;
  approvedAt: string;
  approvalBasis: string;
  legalNotice: string;
  defaultPermissionStatus: "UNVERIFIED";
  realAdsAllowed: false;
  thirdPartyBytesCommittedToGit: false;
  entries: ApprovedMediaEntry[];
}

export const approvedMediaManifest = manifestJson as ApprovedMediaManifest;

export function validateApprovedMediaManifest(manifest: ApprovedMediaManifest = approvedMediaManifest) {
  const errors: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();

  if (manifest.schemaVersion !== 1) errors.push("Approved-media schema version must be 1.");
  if (!Number.isFinite(Date.parse(manifest.approvedAt))) errors.push("Approved-media approval timestamp is invalid.");
  if (manifest.realAdsAllowed !== false) errors.push("Owner-approved unverified media must disable real ads.");
  if (manifest.thirdPartyBytesCommittedToGit !== false) errors.push("Third-party media bytes must not be committed to Git.");

  for (const entry of manifest.entries) {
    if (ids.has(entry.candidateId)) errors.push(`Duplicate approved-media candidate id: ${entry.candidateId}.`);
    if (slugs.has(entry.characterSlug)) errors.push(`Duplicate approved-media character slug: ${entry.characterSlug}.`);
    ids.add(entry.candidateId);
    slugs.add(entry.characterSlug);
    if (!entry.sourcePageUrl.startsWith("https://") || !entry.sourceMediaUrl.startsWith("https://")) errors.push(`${entry.characterSlug} requires HTTPS source URLs.`);
    if (entry.permissionStatus !== "UNVERIFIED" || entry.adEligible !== false) errors.push(`${entry.characterSlug} must remain unverified and ad-disabled.`);
    if (!entry.altText.en.trim() || !entry.altText["zh-Hant"].trim()) errors.push(`${entry.characterSlug} requires English and Traditional Chinese alt text.`);
    if (entry.publicationDecision === "PUBLISH_UNVERIFIED" && entry.sfwReview !== "SAFE") errors.push(`${entry.characterSlug} cannot publish without an SFW review.`);
  }

  return errors;
}
