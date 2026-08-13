import { createHash } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { AppError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { probeRemoteMedia } from "../../scripts/media/import-safety";

type ImportSourceKind = "FAN_ART" | "OPEN_LICENSE" | "OFFICIAL_REFERENCE" | "USER_PROVIDED";
type Permission = "VERIFIED" | "CREATOR_GRANTED" | "UNVERIFIED";

function storage() {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey || !publicBaseUrl) throw new AppError("S3 media storage is not configured.", 503, "STORAGE_NOT_CONFIGURED");
  return { bucket, publicBaseUrl, client: new S3Client({ endpoint, region, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true", credentials: { accessKeyId, secretAccessKey } }) };
}

const variants = [
  { kind: "THUMBNAIL" as const, width: 360, height: 360 },
  { kind: "CARD" as const, width: 900, height: 1200 },
  { kind: "HERO" as const, width: 1600, height: 1200 },
  { kind: "WALLPAPER" as const, width: 1920, height: 1080 },
];

function publicUrl(base: string, key: string) {
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function importRemoteCharacterMedia(input: {
  adminUserId: string;
  characterId: string;
  directMediaUrl: string;
  sourcePageUrl: string;
  sourceKind: ImportSourceKind;
  permissionStatus: Permission;
  creatorName?: string;
  creatorUrl?: string;
  licenseName?: string;
  licenseUrl?: string;
  permissionEvidence?: string;
  label: string;
  altTextEn: string;
  altTextZhHant: string;
  riskAcknowledged: boolean;
}) {
  if (input.permissionStatus === "UNVERIFIED" && !input.riskAcknowledged) throw new AppError("Unverified media requires explicit risk acknowledgement.", 422, "RISK_ACK_REQUIRED");
  for (const url of [input.sourcePageUrl, input.creatorUrl, input.licenseUrl].filter(Boolean) as string[]) if (!url.startsWith("https://")) throw new AppError("Media source URLs must use HTTPS.", 422, "HTTPS_REQUIRED");
  const character = await prisma.character.findUnique({ where: { id: input.characterId }, select: { id: true, slug: true } });
  if (!character) throw new AppError("Character not found.", 404, "CHARACTER_NOT_FOUND");
  const probed = await probeRemoteMedia(input.directMediaUrl);
  if (await prisma.characterAsset.findUnique({ where: { checksum: probed.sha256 }, select: { id: true } })) throw new AppError("This media file is already registered.", 409, "DUPLICATE_MEDIA");

  const s3 = storage();
  const prefix = `catalog-v2/${character.slug}/${probed.sha256.slice(0, 16)}`;
  const normalized = await sharp(probed.bytes).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer({ resolveWithObject: true });
  const originalKey = `${prefix}/source-normalized.webp`;
  await s3.client.send(new PutObjectCommand({ Bucket: s3.bucket, Key: originalKey, Body: normalized.data, ContentType: "image/webp", CacheControl: "public,max-age=31536000,immutable", Metadata: { "source-checksum": probed.sha256, "source-page": input.sourcePageUrl, "permission-status": input.permissionStatus } }));

  const derivatives: Array<(typeof variants)[number] & { key: string; checksum: string; byteSize: number; url: string }> = [];
  for (const variant of variants) {
    const output = await sharp(probed.bytes).rotate().resize(variant.width, variant.height, { fit: "cover", position: "attention" }).webp({ quality: variant.kind === "THUMBNAIL" ? 82 : 88 }).toBuffer();
    const key = `${prefix}/${variant.kind.toLowerCase()}.webp`;
    const checksum = createHash("sha256").update(output).digest("hex");
    await s3.client.send(new PutObjectCommand({ Bucket: s3.bucket, Key: key, Body: output, ContentType: "image/webp", CacheControl: "public,max-age=31536000,immutable", Metadata: { "source-checksum": probed.sha256 } }));
    derivatives.push({ ...variant, key, checksum, byteSize: output.byteLength, url: publicUrl(s3.publicBaseUrl, key) });
  }

  return prisma.$transaction(async (tx) => {
    const asset = await tx.characterAsset.create({ data: {
      characterId: character.id, kind: "HERO", label: input.label, storageKey: originalKey, publicUrl: publicUrl(s3.publicBaseUrl, originalKey), altText: input.altTextEn,
      workflowStatus: "REVIEWED", sourceKind: input.sourceKind, permissionStatus: input.permissionStatus, contentRating: "SFW", sourceUrl: input.sourcePageUrl, originalMediaUrl: probed.finalUrl,
      creatorName: input.creatorName, creatorUrl: input.creatorUrl, licenseName: input.licenseName, licenseUrl: input.licenseUrl, permissionEvidence: input.permissionEvidence,
      retrievedAt: new Date(), checksum: probed.sha256, mimeType: "image/webp", byteSize: normalized.data.byteLength, reviewedById: input.adminUserId, reviewedAt: new Date(),
      riskAcknowledgedById: input.riskAcknowledged ? input.adminUserId : undefined, riskAcknowledgedAt: input.riskAcknowledged ? new Date() : undefined, primaryPriority: 100,
      locales: { create: [{ locale: "EN", altText: input.altTextEn }, { locale: "ZH_HANT", altText: input.altTextZhHant }] },
      derivatives: { create: derivatives.map((entry) => ({ kind: entry.kind, storageKey: entry.key, publicUrl: entry.url, mimeType: "image/webp", width: entry.width, height: entry.height, byteSize: entry.byteSize, checksum: entry.checksum })) },
      auditLogs: { create: [{ actorUserId: input.adminUserId, action: "CREATED", detail: { sourceUrl: input.sourcePageUrl, originalChecksum: probed.sha256, redirectCount: probed.redirectCount } }, { actorUserId: input.adminUserId, action: "RIGHTS_REVIEWED", detail: { permissionStatus: input.permissionStatus, riskAcknowledged: input.riskAcknowledged } }] },
    }, include: { derivatives: true, locales: true } });
    return { id: asset.id, workflowStatus: asset.workflowStatus, permissionStatus: asset.permissionStatus, sourceUrl: asset.sourceUrl, publicUrl: asset.publicUrl, derivatives: asset.derivatives.map((entry) => ({ kind: entry.kind, url: entry.publicUrl, width: entry.width, height: entry.height })) };
  });
}
