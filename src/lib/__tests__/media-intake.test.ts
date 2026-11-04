// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
const mocks = vi.hoisted(() => ({ probe: vi.fn(), send: vi.fn(), lookup: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("../../../scripts/media/import-safety", async (original) => ({ ...(await original<object>()), probeRemoteMedia: mocks.probe }));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class { send = mocks.send; },
  PutObjectCommand: class { constructor(public input: unknown) {} },
  GetObjectCommand: class { constructor(public input: unknown) {} },
}));
import { importRemotePostMedia, isNormalizedPostMedia, postMediaOwnerKey } from "@/lib/media-intake";

describe("private post intake", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const [key, value] of Object.entries({ NEXTAUTH_URL: "https://app.example.org", S3_ENDPOINT: "https://storage.example.org", S3_REGION: "auto", S3_BUCKET: "public", S3_PRIVATE_BUCKET: "quarantine", S3_ACCESS_KEY_ID: "test", S3_SECRET_ACCESS_KEY: "test", S3_PUBLIC_BASE_URL: "https://cdn.example.org" })) vi.stubEnv(key, value);
    mocks.send.mockResolvedValue({});
  });
  afterEach(() => vi.unstubAllEnvs());

  it("stores normalized WebP in the private bucket without ACLs or an exposed S3 URL", async () => {
    const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: "red" } }).png().toBuffer();
    mocks.probe.mockResolvedValue({ bytes, sha256: "a".repeat(64) });
    const media = await importRemotePostMedia("https://images.example.org/image.png", "creator");
    const command = mocks.send.mock.calls[0][0].input;
    expect(command).toMatchObject({ Bucket: "quarantine", ContentType: "image/webp", CacheControl: "private,no-store" });
    expect(command).not.toHaveProperty("ACL");
    expect((await sharp(command.Body).metadata()).format).toBe("webp");
    expect(media.publicUrl).toMatch(/^https:\/\/app.example.org\/api\/post-media\//);
    expect(isNormalizedPostMedia(media, "creator")).toBe(true);
    expect(isNormalizedPostMedia(media, "other-user")).toBe(false);
    expect(isNormalizedPostMedia({ ...media, publicUrl: "https://evil.example.org/image.webp" }, "creator")).toBe(false);
    expect(media.storageKey).toContain(postMediaOwnerKey("creator"));
  });

  it.each(["", "public"])("fails closed for an absent or shared private bucket (%s)", async (bucket) => {
    vi.stubEnv("S3_PRIVATE_BUCKET", bucket);
    await expect(importRemotePostMedia("https://images.example.org/a.png", "creator")).rejects.toMatchObject({ status: 503, code: "PRIVATE_STORAGE_NOT_CONFIGURED" });
    expect(mocks.probe).not.toHaveBeenCalled();
  });

  it("does not upload malformed image bytes even if the header probe passed", async () => {
    mocks.probe.mockResolvedValue({ bytes: Buffer.from("not an image"), sha256: "b".repeat(64) });
    await expect(importRemotePostMedia("https://images.example.org/a.png", "creator")).rejects.toMatchObject({ code: "MEDIA_INTAKE_FAILED" });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("revalidates and pins transport DNS rather than trusting the earlier probe lookup", async () => {
    mocks.lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    mocks.probe.mockImplementation(async (url, options) => options.fetchImpl(url));
    await expect(importRemotePostMedia("https://images.example.org/a.png", "creator")).rejects.toMatchObject({ code: "MEDIA_INTAKE_FAILED" });
    expect(mocks.lookup).toHaveBeenCalledWith("images.example.org", expect.objectContaining({ family: 4, all: true }));
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
