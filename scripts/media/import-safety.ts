import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { validatePublicHttpsUrl } from "../../src/lib/media-manifest";

export const MAX_MEDIA_BYTES = 15 * 1024 * 1024;
export const MAX_MEDIA_REDIRECTS = 3;
export const MEDIA_FETCH_TIMEOUT_MS = 15_000;

const allowedMimeTypes = new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"]);

export interface MediaProbeResult {
  sourceUrl: string;
  finalUrl: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  redirectCount: number;
  bytes: Uint8Array;
}

export type AddressResolver = (hostname: string) => Promise<string[]>;

function isReservedIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isReservedIpv6(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith("2001:db8:")) return true;

  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isReservedIpv4(mapped[1]) : false;
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !isReservedIpv4(address);
  if (family === 6) return !isReservedIpv6(address);
  return false;
}

const defaultResolver: AddressResolver = async (hostname) => {
  const results = await lookup(hostname, { all: true, verbatim: true });
  return results.map((entry) => entry.address);
};

export async function assertPublicHttpsTarget(url: string, resolver: AddressResolver = defaultResolver): Promise<URL> {
  const validationError = validatePublicHttpsUrl(url);
  if (validationError) throw new Error(`Unsafe media URL: ${validationError}.`);

  const parsed = new URL(url);
  const addresses = await resolver(parsed.hostname);
  if (!addresses.length) throw new Error("Media host did not resolve to an address.");
  if (addresses.some((address) => !isPublicAddress(address))) {
    throw new Error("Media host resolves to a private or reserved address.");
  }
  return parsed;
}

function sniffMimeType(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index])) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes.length >= 6) {
    const signature = new TextDecoder().decode(bytes.slice(0, 6));
    if (signature === "GIF87a" || signature === "GIF89a") return "image/gif";
  }
  if (bytes.length >= 12) {
    const riff = new TextDecoder().decode(bytes.slice(0, 4));
    const webp = new TextDecoder().decode(bytes.slice(8, 12));
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";
    const box = new TextDecoder().decode(bytes.slice(4, 12));
    if (box.startsWith("ftypavif") || box.startsWith("ftypavis")) return "image/avif";
  }
  return null;
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (!response.body) throw new Error("Media response has no body.");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Media exceeds the ${maxBytes}-byte limit.`);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function probeRemoteMedia(
  sourceUrl: string,
  options: {
    fetchImpl?: typeof fetch;
    resolver?: AddressResolver;
    maxBytes?: number;
    maxRedirects?: number;
    timeoutMs?: number;
  } = {},
): Promise<MediaProbeResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const resolver = options.resolver ?? defaultResolver;
  const maxBytes = options.maxBytes ?? MAX_MEDIA_BYTES;
  const maxRedirects = options.maxRedirects ?? MAX_MEDIA_REDIRECTS;
  const timeoutMs = options.timeoutMs ?? MEDIA_FETCH_TIMEOUT_MS;
  let currentUrl = (await assertPublicHttpsTarget(sourceUrl, resolver)).toString();
  let redirectCount = 0;

  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(currentUrl, {
        method: "GET",
        redirect: "manual",
        credentials: "omit",
        signal: controller.signal,
        headers: {
          Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
          "User-Agent": "ACG-Polymarket-Media-Validator/1.0",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      if (redirectCount >= maxRedirects) throw new Error(`Media exceeded the ${maxRedirects}-redirect limit.`);
      const location = response.headers.get("location");
      if (!location) throw new Error("Media redirect did not include a Location header.");
      currentUrl = (await assertPublicHttpsTarget(new URL(location, currentUrl).toString(), resolver)).toString();
      redirectCount += 1;
      continue;
    }

    if (!response.ok) throw new Error(`Media request failed with HTTP ${response.status}.`);
    const declaredMime = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() ?? "";
    if (!allowedMimeTypes.has(declaredMime)) throw new Error(`Unsupported media MIME type: ${declaredMime || "missing"}.`);

    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new Error(`Media Content-Length exceeds the ${maxBytes}-byte limit.`);
    }

    const bytes = await readLimitedBody(response, maxBytes);
    const sniffedMime = sniffMimeType(bytes);
    if (!sniffedMime || sniffedMime !== declaredMime) {
      throw new Error(`Media signature ${sniffedMime ?? "unknown"} does not match declared MIME ${declaredMime}.`);
    }

    return {
      sourceUrl,
      finalUrl: currentUrl,
      mimeType: declaredMime,
      byteSize: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      redirectCount,
      bytes,
    };
  }
}
