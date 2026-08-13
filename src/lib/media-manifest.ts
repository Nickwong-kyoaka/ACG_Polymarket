import { z } from "zod";

export const MEDIA_MANIFEST_VERSION = 1 as const;

export type MediaSourceKind =
  | "AI_GENERATED"
  | "FAN_ART"
  | "OPEN_LICENSE"
  | "OFFICIAL_REFERENCE";

export type MediaPermissionStatus =
  | "VERIFIED"
  | "CREATOR_GRANTED"
  | "UNVERIFIED"
  | "REJECTED"
  | "TAKEDOWN_REQUESTED";

export type MediaSfwRating = "SAFE" | "REVIEW_REQUIRED" | "REJECTED";

export interface MediaManifestEntry {
  id: string;
  characterSlug: string;
  creatorOrOfficialAccount: string;
  creatorOrOfficialAccountUrl: string | null;
  originalPage: string | null;
  directMediaUrl: string | null;
  localAssetPath: string | null;
  sourceKind: MediaSourceKind;
  permissionStatus: MediaPermissionStatus;
  permissionEvidenceUrl: string | null;
  licenseName: string | null;
  licenseUrl: string | null;
  retrievalTimestamp: string;
  intendedS3Key: string;
  sfwRating: MediaSfwRating;
  publicationEligible: boolean;
  adEligible: boolean;
  sourceBadgeRequired: boolean;
  takedownEnabled: boolean;
  candidateNotes: string;
  unresolvedReason: string | null;
  aiProvenance: {
    model: string;
    modelVersion: string;
    prompt: string;
    generatedAt: string;
  } | null;
}

export interface MediaSourceManifest {
  schemaVersion: typeof MEDIA_MANIFEST_VERSION;
  catalogVersion: "v2";
  generatedAt: string;
  entries: MediaManifestEntry[];
}

export interface ManifestValidationResult {
  ok: boolean;
  errors: string[];
  unresolved: MediaManifestEntry[];
}

const mediaManifestEntrySchema = z
  .object({
    id: z.string().min(1),
    characterSlug: z.string().min(1),
    creatorOrOfficialAccount: z.string(),
    creatorOrOfficialAccountUrl: z.string().nullable(),
    originalPage: z.string().nullable(),
    directMediaUrl: z.string().nullable(),
    localAssetPath: z.string().nullable(),
    sourceKind: z.enum(["AI_GENERATED", "FAN_ART", "OPEN_LICENSE", "OFFICIAL_REFERENCE"]),
    permissionStatus: z.enum(["VERIFIED", "CREATOR_GRANTED", "UNVERIFIED", "REJECTED", "TAKEDOWN_REQUESTED"]),
    permissionEvidenceUrl: z.string().nullable(),
    licenseName: z.string().nullable(),
    licenseUrl: z.string().nullable(),
    retrievalTimestamp: z.string(),
    intendedS3Key: z.string().min(1),
    sfwRating: z.enum(["SAFE", "REVIEW_REQUIRED", "REJECTED"]),
    publicationEligible: z.boolean(),
    adEligible: z.boolean(),
    sourceBadgeRequired: z.boolean(),
    takedownEnabled: z.boolean(),
    candidateNotes: z.string(),
    unresolvedReason: z.string().nullable(),
    aiProvenance: z
      .object({
        model: z.string().min(1),
        modelVersion: z.string().min(1),
        prompt: z.string().min(1),
        generatedAt: z.string().min(1),
      })
      .strict()
      .nullable(),
  })
  .strict();

const mediaSourceManifestSchema = z
  .object({
    schemaVersion: z.literal(MEDIA_MANIFEST_VERSION),
    catalogVersion: z.literal("v2"),
    generatedAt: z.string(),
    entries: z.array(mediaManifestEntrySchema),
  })
  .strict();

const reservedHostnames = new Set(["localhost", "localhost.localdomain", "metadata.google.internal"]);

function isReservedIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

export function validatePublicHttpsUrl(value: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "must be a valid URL";
  }

  if (parsed.protocol !== "https:") return "must use HTTPS";
  if (parsed.username || parsed.password) return "must not contain embedded credentials";

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    reservedHostnames.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "::" ||
    hostname === "::1" ||
    (hostname.includes(":") &&
      (hostname.startsWith("fc") ||
        hostname.startsWith("fd") ||
        hostname.startsWith("fe8") ||
        hostname.startsWith("fe9") ||
        hostname.startsWith("fea") ||
        hostname.startsWith("feb"))) ||
    isReservedIpv4(hostname)
  ) {
    return "must not target a private or reserved host";
  }

  return null;
}

function validateOptionalUrl(errors: string[], entry: MediaManifestEntry, field: keyof MediaManifestEntry): void {
  const value = entry[field];
  if (typeof value !== "string" || !value) return;
  const urlError = validatePublicHttpsUrl(value);
  if (urlError) errors.push(`${entry.id}.${field} ${urlError}.`);
}

export function validateMediaManifest(
  manifest: MediaSourceManifest,
  options: { expectedCharacterSlugs?: readonly string[] } = {},
): ManifestValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();
  const characterSlugs = new Set<string>();

  if (manifest.schemaVersion !== MEDIA_MANIFEST_VERSION) errors.push(`Unsupported manifest schema ${manifest.schemaVersion}.`);
  if (manifest.catalogVersion !== "v2") errors.push(`Unsupported catalog version ${manifest.catalogVersion}.`);
  if (Number.isNaN(Date.parse(manifest.generatedAt))) errors.push("generatedAt must be an ISO timestamp.");

  for (const entry of manifest.entries) {
    if (ids.has(entry.id)) errors.push(`Duplicate manifest id: ${entry.id}.`);
    if (characterSlugs.has(entry.characterSlug)) errors.push(`Duplicate character source entry: ${entry.characterSlug}.`);
    ids.add(entry.id);
    characterSlugs.add(entry.characterSlug);

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.characterSlug)) {
      errors.push(`${entry.id}.characterSlug must be a lowercase kebab-case slug.`);
    }
    if (!/^catalog-v2\/[a-z0-9-]+\/[a-z0-9._-]+$/.test(entry.intendedS3Key)) {
      errors.push(`${entry.id}.intendedS3Key is outside the catalog-v2 prefix or contains unsafe characters.`);
    }
    if (Number.isNaN(Date.parse(entry.retrievalTimestamp))) {
      errors.push(`${entry.id}.retrievalTimestamp must be an ISO timestamp.`);
    }

    validateOptionalUrl(errors, entry, "creatorOrOfficialAccountUrl");
    validateOptionalUrl(errors, entry, "originalPage");
    validateOptionalUrl(errors, entry, "directMediaUrl");
    validateOptionalUrl(errors, entry, "permissionEvidenceUrl");
    validateOptionalUrl(errors, entry, "licenseUrl");

    if (entry.sourceKind !== "AI_GENERATED" && !entry.originalPage) {
      errors.push(`${entry.id} requires an original source page.`);
    }
    if (entry.localAssetPath && !entry.localAssetPath.startsWith("/assets/")) {
      errors.push(`${entry.id}.localAssetPath must stay below /assets/.`);
    }
    if (entry.localAssetPath && entry.directMediaUrl) {
      errors.push(`${entry.id} must select either a local asset or a remote media URL, not both.`);
    }
    if (entry.sourceKind === "AI_GENERATED" && entry.publicationEligible && !entry.aiProvenance) {
      errors.push(`${entry.id} cannot publish AI media without model, version, prompt, and generation time.`);
    }
    if (entry.sourceKind === "OPEN_LICENSE" && (!entry.licenseName || !entry.licenseUrl)) {
      errors.push(`${entry.id} requires a license name and URL for open-license media.`);
    }
    if (entry.sourceKind === "FAN_ART" && !entry.creatorOrOfficialAccount.trim()) {
      errors.push(`${entry.id} requires a creator identity for fan art.`);
    }
    if (entry.permissionStatus === "CREATOR_GRANTED" && !entry.permissionEvidenceUrl) {
      errors.push(`${entry.id} requires evidence for creator-granted permission.`);
    }
    if (entry.permissionStatus === "REJECTED" || entry.permissionStatus === "TAKEDOWN_REQUESTED") {
      if (entry.publicationEligible || entry.adEligible) errors.push(`${entry.id} cannot publish or show ads after rejection/takedown.`);
    }
    if (entry.sfwRating !== "SAFE" && (entry.publicationEligible || entry.adEligible)) {
      errors.push(`${entry.id} must pass SFW review before publication or ads.`);
    }
    if (entry.adEligible && !["VERIFIED", "CREATOR_GRANTED"].includes(entry.permissionStatus)) {
      errors.push(`${entry.id} cannot be ad eligible while permission is ${entry.permissionStatus}.`);
    }
    if (entry.publicationEligible && !entry.directMediaUrl && !entry.localAssetPath) {
      errors.push(`${entry.id} has no renderable media candidate.`);
    }
    if (entry.publicationEligible && (!entry.sourceBadgeRequired || !entry.takedownEnabled)) {
      errors.push(`${entry.id} requires a source badge and takedown path before publication.`);
    }
    if (entry.unresolvedReason && (entry.publicationEligible || entry.adEligible)) {
      errors.push(`${entry.id} cannot be eligible while unresolvedReason is present.`);
    }
  }

  if (options.expectedCharacterSlugs) {
    const expected = new Set(options.expectedCharacterSlugs);
    if (manifest.entries.length !== expected.size) {
      errors.push(`Manifest must contain ${expected.size} character entries; received ${manifest.entries.length}.`);
    }
    for (const slug of expected) if (!characterSlugs.has(slug)) errors.push(`Manifest is missing character ${slug}.`);
    for (const slug of characterSlugs) if (!expected.has(slug)) errors.push(`Manifest contains unexpected character ${slug}.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    unresolved: manifest.entries.filter((entry) => Boolean(entry.unresolvedReason)),
  };
}

export function parseMediaManifest(value: unknown): MediaSourceManifest {
  return mediaSourceManifestSchema.parse(value);
}
