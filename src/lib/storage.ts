import "server-only";

import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "@/lib/api";

function safeFilename(filename: string) {
  const [base = "asset", extension = ""] = filename.toLowerCase().split(/\.(?=[^.]+$)/);
  const safeBase = base.replace(/[^a-z0-9-_]+/g, "-").replace(/^-|-$/g, "") || "asset";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "");
  return `${safeBase.slice(0, 80)}${safeExtension ? `.${safeExtension}` : ""}`;
}

function requiredStorageConfig() {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }
  return {
    bucket,
    accessKeyId,
    secretAccessKey,
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
  };
}

export async function createPresignedAssetUpload(input: {
  filename: string;
  contentType: string;
  byteSize: number;
}) {
  if (!/^(image|audio)\//.test(input.contentType)) {
    throw new AppError("Only image and audio uploads are accepted.", 422, "UNSUPPORTED_MEDIA_TYPE");
  }

  const storageKey = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeFilename(input.filename)}`;
  const config = requiredStorageConfig();
  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError("Media storage is not configured.", 503, "STORAGE_NOT_CONFIGURED");
    }
    return {
      mode: "local-demo" as const,
      storageKey,
      uploadUrl: null,
      publicUrl: `/assets/demo-upload-placeholder.svg?key=${encodeURIComponent(storageKey)}`,
      expiresIn: 0,
    };
  }

  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: Boolean(config.endpoint),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      ContentType: input.contentType,
      ContentLength: input.byteSize,
    }),
    { expiresIn: 15 * 60 },
  );
  const baseUrl = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");

  return {
    mode: "s3" as const,
    storageKey,
    uploadUrl,
    publicUrl: baseUrl ? `${baseUrl}/${storageKey}` : undefined,
    expiresIn: 15 * 60,
  };
}
