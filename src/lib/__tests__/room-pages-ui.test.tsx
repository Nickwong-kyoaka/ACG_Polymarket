import type { ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Character, Profile } from "@/lib/types";

const mocks = vi.hoisted(() => ({ user: vi.fn(), dashboard: vi.fn(), shop: vi.fn(), characters: vi.fn(), media: vi.fn() }));
vi.mock("@/lib/store", () => ({ getUserByHandle: mocks.user, getMeDashboard: mocks.dashboard, getShopItems: mocks.shop, listCharacters: mocks.characters }));
vi.mock("@/components/room-media.server", () => ({ getPublishedRoomMedia: mocks.media }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/character-art", () => ({ CharacterArt: () => <div /> }));
vi.mock("@/components/profile-appearance", () => ({ ProfileAppearance: ({ profile }: { profile: { displayName: string } }) => <div aria-label="Room appearance">{profile.displayName}</div> }));
vi.mock("@/components/follow-button", () => ({ FollowButton: ({ targetType, targetId }: { targetType: string; targetId: string }) => <button data-target={`${targetType}:${targetId}`}>Follow</button> }));
vi.mock("@/components/reward-claim-panel", () => ({ RewardClaimPanel: () => null }));
vi.mock("@/components/mission-panel", () => ({ MissionPanel: () => null }));
vi.mock("@/components/shop-panel", () => ({ ShopPanel: () => null }));
vi.mock("@/components/profile-settings", () => ({ ProfileSettings: () => null }));

import PublicProfilePage from "@/app/[locale]/u/[handle]/page";
import PlayerRoom from "@/app/[locale]/me/page";

const profile: Profile = { id: "profile", userId: "owner", handle: "fan", displayName: "Fan", bio: "Hello", holdingsVisibility: false, favoriteTags: [], pinnedCharacterIds: [], equippedFrameAsset: "frame", equippedThemeAsset: "theme" };
const character = (id: string): Character => ({ id, slug: id, name: id, title: "Favorite", tags: [] } as unknown as Character);
beforeEach(() => { vi.stubEnv("FEATURE_COMMUNITY", "true"); vi.stubEnv("FEATURE_PREDICTIONS", "true"); vi.clearAllMocks(); mocks.media.mockResolvedValue([]); mocks.shop.mockResolvedValue([]); mocks.characters.mockResolvedValue([]); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("room page boundaries (mocked persistence only)", () => {
  it("never renders private holdings even if the data response contains positions", async () => {
    mocks.user.mockResolvedValue({ user: { id: "owner", email: "private@example.com" }, profile, pinnedCharacters: [], positions: [{ character: character("Secret favorite"), units: 123 }] });
    render(await PublicProfilePage({ params: Promise.resolve({ locale: "en", handle: "fan" }) }));
    expect(screen.queryByText("Secret favorite")).not.toBeInTheDocument();
    expect(screen.getByText("No favorites are on display yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Follow" })).toHaveAttribute("data-target", "user:owner");
    expect(document.body.textContent).not.toContain("private@example.com");
    expect(mocks.media).toHaveBeenCalledWith(["frame", "theme"]);
  });
  it("keeps chosen pins public and honors owner order, not DB row order", async () => {
    mocks.user.mockResolvedValue({ user: { id: "owner" }, profile: { ...profile, pinnedCharacterIds: ["Second", "First"] }, pinnedCharacters: [character("First"), character("Second")], positions: [] });
    render(await PublicProfilePage({ params: Promise.resolve({ locale: "en", handle: "fan" }) }));
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/en/character/Second", "/en/character/First"]);
  });
  it("links the owner room to posts, collections and the watch library", async () => {
    mocks.dashboard.mockResolvedValue({ profile, wallet: { softBalance: 100 }, positions: [], inventory: [], campaigns: [], alerts: [], notifications: [], watchlist: [], missions: [], work: { earnedToday: 0, dailyLimit: 80 } });
    render(await PlayerRoom({ params: Promise.resolve({ locale: "zh-Hant" }) }) as ReactElement);
    expect(screen.getByRole("link", { name: /我的貼文/ })).toHaveAttribute("href", "/zh-Hant/me/posts");
    expect(screen.getByRole("link", { name: /我的收藏/ })).toHaveAttribute("href", "/zh-Hant/me/collections");
    expect(screen.getByRole("link", { name: "追番資料庫" })).toHaveAttribute("href", "/zh-Hant/me/library");
    expect(screen.getByRole("link", { name: "審核與申訴" })).toHaveAttribute("href", "/zh-Hant/me/moderation");
    expect(screen.getByRole("link", { name: "我的創作系列" })).toHaveAttribute("href", "/zh-Hant/me/series");
  });
  it("hides disabled community and prediction destinations but retains moderation access", async () => {
    vi.stubEnv("FEATURE_COMMUNITY", "false"); vi.stubEnv("FEATURE_PREDICTIONS", "false");
    mocks.dashboard.mockResolvedValue({ profile, wallet: { softBalance: 100 }, positions: [], inventory: [], campaigns: [], alerts: [], notifications: [], watchlist: [], missions: [], work: { earnedToday: 0, dailyLimit: 80 } });
    render(await PlayerRoom({ params: Promise.resolve({ locale: "zh-Hant" }) }));
    expect(screen.queryByRole("link", { name: /我的貼文|我的收藏|我的創作系列|我的預測/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "審核與申訴" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "追番資料庫" })).toBeInTheDocument();
  });
});
