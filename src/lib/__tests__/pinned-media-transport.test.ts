// @vitest-environment node
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn(), send: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ request: mocks.request }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class { send = mocks.send; },
  PutObjectCommand: class { constructor(public input: unknown) {} },
  GetObjectCommand: class { constructor(public input: unknown) {} },
}));
import { importRemotePostMedia } from "@/lib/media-intake";

function upstream(statusCode: number, headers: Record<string, string> = { "content-type": "image/png" }) {
  const response = Object.assign(Readable.from([]), { statusCode, headers });
  const resume = vi.spyOn(response, "resume");
  const destroy = vi.spyOn(response, "destroy");
  mocks.request.mockImplementation((_url, _options, callback) => {
    const request = Object.assign(new EventEmitter(), { end: () => queueMicrotask(() => callback(response)) });
    return request;
  });
  return { response, resume, destroy };
}

describe("pinned HTTPS response adaptation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    for (const [key, value] of Object.entries({ NEXTAUTH_URL: "https://app.example.org", S3_ENDPOINT: "https://storage.example.org", S3_REGION: "auto", S3_BUCKET: "public", S3_PRIVATE_BUCKET: "quarantine", S3_ACCESS_KEY_ID: "test", S3_SECRET_ACCESS_KEY: "test", S3_PUBLIC_BASE_URL: "https://cdn.example.org" })) vi.stubEnv(key, value);
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([204, 205, 304])("drains HTTP %s and rejects it as media without throwing outside the promise", async (status) => {
    const { resume } = upstream(status);
    await expect(importRemotePostMedia("https://images.example.org/a.png", "creator")).rejects.toMatchObject({ code: "MEDIA_INTAKE_FAILED" });
    expect(resume).toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("destroys the incoming stream and rejects malformed response headers", async () => {
    const { destroy } = upstream(200, { "invalid header name": "value" });
    await expect(importRemotePostMedia("https://images.example.org/a.png", "creator")).rejects.toMatchObject({ code: "MEDIA_INTAKE_FAILED" });
    expect(destroy).toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("contains Response-constructor errors inside the asynchronous callback", async () => {
    const { destroy } = upstream(99);
    await expect(importRemotePostMedia("https://images.example.org/a.png", "creator")).rejects.toMatchObject({ code: "MEDIA_INTAKE_FAILED" });
    expect(destroy).toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
