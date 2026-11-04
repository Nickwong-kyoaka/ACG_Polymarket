import { beforeEach, describe, expect, it, vi } from "vitest";
import { safeRoomMediaUrl } from "@/components/room-ui";
import type { ComfortContent } from "@/lib/types";

const mocks = vi.hoisted(() => ({ assets: vi.fn(), panels: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { characterAsset: { findMany: mocks.assets }, comicPanel: { findMany: mocks.panels } } }));
import { getComfortRoomMedia, getPublishedRoomMedia } from "@/components/room-media.server";

beforeEach(() => { mocks.assets.mockReset().mockResolvedValue([]); mocks.panels.mockReset().mockResolvedValue([]); });
const content = (id: string, kind: ComfortContent["kind"], extra: Partial<ComfortContent> = {}): ComfortContent => ({ id, kind, modeId: "sleep", title: id, body: id, sweetnessLevel: 80, published: true, ...extra });

describe("safe room media DTOs (mocked persistence only)", () => {
  it("rejects script, data, traversal, credential and protocol-relative URLs", () => {
    for (const url of ["javascript:alert(1)", "data:image/svg+xml,secret", "//evil.invalid/a", "/assets/../secret", "https://user:pass@example.com/a", "/assets/\\evil"]) expect(safeRoomMediaUrl(url)).toBeUndefined();
    expect(safeRoomMediaUrl("/assets/cosmetics/frame.svg")).toBe("/assets/cosmetics/frame.svg");
    expect(safeRoomMediaUrl("https://cdn.example.com/a.mp3")).toBe("https://cdn.example.com/a.mp3");
  });
  it("looks up only published assets and returns no private storage or review fields", async () => {
    mocks.assets.mockResolvedValue([{ id: "frame", kind: "AVATAR_FRAME", publicUrl: null, storageKey: "assets/frame.svg", altText: "Frame", label: "Frame", permissionEvidence: "secret", aiPrompt: "private" }]);
    const result = await getPublishedRoomMedia(["frame", undefined, "frame"]);
    expect(mocks.assets.mock.calls[0][0].where).toEqual({ id: { in: ["frame"] }, workflowStatus: "PUBLISHED", contentRating: "SFW", permissionStatus: { notIn: ["REJECTED", "TAKEDOWN_REQUESTED"] } });
    expect(result).toEqual([{ id: "frame", kind: "AVATAR_FRAME", url: "/assets/frame.svg", alt: "Frame", label: "Frame" }]);
  });
  it("does not query or expose locked paid audio or comic panels", async () => {
    const contents = [content("paid-voice", "VOICE", { assetId: "voice", unlockShopItemId: "paid" }), content("paid-comic", "COMIC", { unlockShopItemId: "paid" })];
    expect(await getComfortRoomMedia(contents, [], "en")).toEqual({ audio: undefined, comic: undefined, panels: [] });
    expect(mocks.assets).not.toHaveBeenCalled();
    expect(mocks.panels).not.toHaveBeenCalled();
  });
  it("uses owned published recordings and localized DB panels", async () => {
    mocks.assets.mockResolvedValue([{ id: "voice", kind: "VOICE", publicUrl: "https://cdn.example.com/voice.mp3", storageKey: "private/voice", altText: "Voice", label: "Recording" }]);
    mocks.panels.mockResolvedValue([{ id: "p1", contentId: "comic", imageUrl: "/assets/panel.svg", altText: "A quiet room", locales: [{ caption: "安靜的房間" }] }]);
    const result = await getComfortRoomMedia([content("recording", "VOICE", { assetId: "voice", unlockShopItemId: "paid" }), content("comic", "COMIC")], ["paid"], "zh-Hant");
    expect(result.audio?.url).toBe("https://cdn.example.com/voice.mp3");
    expect(result.panels[0].caption).toBe("安靜的房間");
    expect(mocks.panels.mock.calls[0][0].select.locales.where).toEqual({ locale: "ZH_HANT" });
  });
  it("does not use an unpublished linked audio asset via its raw content URL", async () => {
    const result = await getComfortRoomMedia([content("hidden", "VOICE", { assetId: "unpublished", mediaUrl: "https://cdn.example.com/hidden.mp3" })], [], "en");
    expect(result.audio).toBeUndefined();
  });
});
