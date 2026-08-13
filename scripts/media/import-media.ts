import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { catalogCharactersV2 } from "../../src/data/catalog-v2";
import { parseMediaManifest, validateMediaManifest, type MediaManifestEntry } from "../../src/lib/media-manifest";
import { probeRemoteMedia } from "./import-safety";

interface CliOptions {
  manifestPath: string;
  mode: "dry-run" | "probe" | "upload";
}

function parseArgs(args: string[]): CliOptions {
  let manifestPath = "content/media-sources.json";
  let mode: CliOptions["mode"] = "dry-run";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--manifest") {
      const next = args[index + 1];
      if (!next) throw new Error("--manifest requires a path.");
      manifestPath = next;
      index += 1;
    } else if (arg === "--probe") {
      mode = "probe";
    } else if (arg === "--upload") {
      mode = "upload";
    } else if (arg !== "--dry-run") {
      throw new Error(`Unknown media import option: ${arg}.`);
    }
  }

  return { manifestPath, mode };
}

function renderUnresolved(entry: MediaManifestEntry): string {
  return `- ${entry.characterSlug}: ${entry.unresolvedReason ?? "no direct media candidate"} (${entry.originalPage ?? entry.localAssetPath ?? "no source"})`;
}

function createS3Client(): { client: S3Client; bucket: string } {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Upload mode requires S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.");
  }

  return {
    bucket,
    client: new S3Client({
      endpoint,
      region,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

export async function runMediaImport(args: string[]): Promise<void> {
  const options = parseArgs(args);
  const raw = JSON.parse(await readFile(options.manifestPath, "utf8")) as unknown;
  const manifest = parseMediaManifest(raw);
  const validation = validateMediaManifest(manifest, {
    expectedCharacterSlugs: catalogCharactersV2.map((entry) => entry.slug),
  });

  if (!validation.ok) throw new Error(`Manifest validation failed:\n${validation.errors.map((error) => `- ${error}`).join("\n")}`);

  const remoteCandidates = manifest.entries.filter(
    (entry) => entry.directMediaUrl && !entry.unresolvedReason && entry.sfwRating === "SAFE",
  );
  console.log(`Validated ${manifest.entries.length} source records for catalog ${manifest.catalogVersion}.`);
  console.log(`${validation.unresolved.length} unresolved; ${remoteCandidates.length} remote candidates ready to probe.`);
  if (validation.unresolved.length) console.log(validation.unresolved.map(renderUnresolved).join("\n"));

  if (options.mode === "dry-run") {
    console.log("Dry run complete. No network media request or S3 write was performed.");
    return;
  }

  const s3 = options.mode === "upload" ? createS3Client() : null;
  for (const entry of remoteCandidates) {
    const result = await probeRemoteMedia(entry.directMediaUrl!);
    console.log(`${entry.characterSlug}: ${result.mimeType}, ${result.byteSize} bytes, sha256=${result.sha256}`);
    if (s3) {
      await s3.client.send(
        new PutObjectCommand({
          Bucket: s3.bucket,
          Key: entry.intendedS3Key,
          Body: result.bytes,
          ContentType: result.mimeType,
          Metadata: {
            "source-sha256": result.sha256,
            "source-page": entry.originalPage ?? "",
            "permission-status": entry.permissionStatus,
          },
        }),
      );
      console.log(`${entry.characterSlug}: uploaded to s3://${s3.bucket}/${entry.intendedS3Key}.`);
    }
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  runMediaImport(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
