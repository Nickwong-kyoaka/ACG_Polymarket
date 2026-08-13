import { describe, expect, it, vi } from "vitest";
import { assertPublicHttpsTarget, isPublicAddress, probeRemoteMedia } from "../import-safety";

const publicResolver = async () => ["93.184.216.34"];

describe("media import network safety", () => {
  it("blocks private and reserved IPv4/IPv6 targets", async () => {
    expect(isPublicAddress("10.0.0.1")).toBe(false);
    expect(isPublicAddress("169.254.169.254")).toBe(false);
    expect(isPublicAddress("127.0.0.1")).toBe(false);
    expect(isPublicAddress("::1")).toBe(false);
    expect(isPublicAddress("fd00::1")).toBe(false);
    expect(isPublicAddress("93.184.216.34")).toBe(true);

    await expect(assertPublicHttpsTarget("https://images.example.com/a.png", async () => ["10.1.2.3"])).rejects.toThrow(
      "private or reserved",
    );
  });

  it("probes an in-memory PNG, verifies MIME, and calculates a checksum", async () => {
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
    const fetchImpl = vi.fn(async () =>
      new Response(png, {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(png.byteLength) },
      }),
    ) as unknown as typeof fetch;

    const result = await probeRemoteMedia("https://images.example.com/a.png", { fetchImpl, resolver: publicResolver });
    expect(result.mimeType).toBe("image/png");
    expect(result.byteSize).toBe(png.byteLength);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects redirects to a private host before making the second request", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(null, { status: 302, headers: { location: "https://127.0.0.1/secret.png" } }),
    ) as unknown as typeof fetch;

    await expect(
      probeRemoteMedia("https://images.example.com/a.png", { fetchImpl, resolver: publicResolver }),
    ).rejects.toThrow("private or reserved host");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects HTML disguised as an image and oversized content", async () => {
    const htmlFetch = vi.fn(async () =>
      new Response("<html></html>", { status: 200, headers: { "content-type": "image/png" } }),
    ) as unknown as typeof fetch;
    await expect(
      probeRemoteMedia("https://images.example.com/a.png", { fetchImpl: htmlFetch, resolver: publicResolver }),
    ).rejects.toThrow("does not match declared MIME");

    const oversizedFetch = vi.fn(async () =>
      new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": "1024" },
      }),
    ) as unknown as typeof fetch;
    await expect(
      probeRemoteMedia("https://images.example.com/a.png", {
        fetchImpl: oversizedFetch,
        resolver: publicResolver,
        maxBytes: 32,
      }),
    ).rejects.toThrow("Content-Length exceeds");
  });
});
