import { createHash, randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { AppError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { assertPublicHttpsTarget, MEDIA_FETCH_TIMEOUT_MS, probeRemoteMedia } from "../../scripts/media/import-safety";

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

// Pin the validated DNS answer to the TLS connection, including every redirect.
// A separate DNS check followed by ordinary fetch is vulnerable to rebinding.
const pinnedMediaFetch: typeof fetch = async (input) => {
  const value = String(input);
  // IPv4-only transport also excludes IPv4-mapped/transition IPv6 bypasses.
  const addresses = await lookup(new URL(value).hostname, { family: 4, all: true, verbatim: true });
  const url = await assertPublicHttpsTarget(value, async () => addresses.map((entry) => entry.address));
  const address = addresses[0];
  return new Promise<Response>((resolve, reject) => {
    const request = httpsRequest(url, {
      agent: false,
      family: 4,
      signal: AbortSignal.timeout(MEDIA_FETCH_TIMEOUT_MS),
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif", "User-Agent": "ACG-Media-Intake/1.0" },
    }, (response) => {
      try {
        const headers = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
        }
        const status = response.statusCode;
        if (status === 204 || status === 205 || status === 304) {
          response.resume();
          resolve(new Response(null, { status, headers }));
          return;
        }
        resolve(new Response(Readable.toWeb(response) as ReadableStream<Uint8Array>, { status, headers }));
      } catch (error) {
        response.destroy();
        reject(error);
      }
    });
    request.on("error", reject);
    request.end();
  });
};

export function postMediaOwnerKey(userId: string) {
  return createHash("sha256").update(userId).digest("hex").slice(0, 32);
}

function postMediaOrigin() {
  const value = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
  const url = value ? new URL(value) : null;
  if (!url || url.protocol !== "https:" || url.username || url.password) {
    throw new AppError("An HTTPS app origin is required for media intake.", 503, "MEDIA_ORIGIN_NOT_CONFIGURED");
  }
  return url.origin;
}

function privatePostStorage() {
  const bucket = process.env.S3_PRIVATE_BUCKET;
  if (!bucket || bucket === process.env.S3_BUCKET) throw new AppError("A separate private media bucket is required for review quarantine.", 503, "PRIVATE_STORAGE_NOT_CONFIGURED");
  return { ...storage(), bucket };
}

export function isNormalizedPostMedia(media: { storageKey: string | null | undefined; publicUrl: string | null | undefined }, userId: string) {
  const match = media.storageKey?.match(/^post-media\/([a-f0-9]{32})\/([a-f0-9-]{36})\.webp$/);
  return Boolean(match && match[1] === postMediaOwnerKey(userId) && media.publicUrl === `${postMediaOrigin()}/api/post-media/${match[2]}`);
}

export async function importRemotePostMedia(directMediaUrl: string, userId: string) {
  const origin = postMediaOrigin();
  const s3 = privatePostStorage();
  try {
    const probed = await probeRemoteMedia(directMediaUrl, { fetchImpl: pinnedMediaFetch });
    const normalized = await sharp(probed.bytes, { limitInputPixels: 40_000_000, animated: false })
      .rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88 }).toBuffer();
    const id = randomUUID();
    const storageKey = `post-media/${postMediaOwnerKey(userId)}/${id}.webp`;
    // Private bucket policy must keep post-media/* private. Only the gated route
    // reads these bytes; quarantine is never exposed through S3_PUBLIC_BASE_URL.
    await s3.client.send(new PutObjectCommand({
      Bucket: s3.bucket, Key: storageKey, Body: normalized, ContentType: "image/webp",
      CacheControl: "private,no-store",
      Metadata: { "source-checksum": probed.sha256, "owner-key": postMediaOwnerKey(userId) },
    }));
    return { publicUrl: `${origin}/api/post-media/${id}`, storageKey };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Media could not be safely fetched, decoded, or stored. Use a public HTTPS image within the 15 MB limit.", 422, "MEDIA_INTAKE_FAILED");
  }
}

export async function readPrivatePostMedia(storageKey: string) {
  if (!/^post-media\/[a-f0-9]{32}\/[a-f0-9-]{36}\.webp$/.test(storageKey)) throw new AppError("Media not found.", 404, "MEDIA_NOT_FOUND");
  const s3 = privatePostStorage();
  const result = await s3.client.send(new GetObjectCommand({ Bucket: s3.bucket, Key: storageKey }));
  if (!result.Body) throw new AppError("Media not found.", 404, "MEDIA_NOT_FOUND");
  return result.Body.transformToByteArray();
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
  const probed = await probeRemoteMedia(input.directMediaUrl, { fetchImpl: pinnedMediaFetch });
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
