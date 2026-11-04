import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkDesk } from "@/components/work-desk";
import { RewardClaimPanel } from "@/components/reward-claim-panel";
import { ProfileSettings } from "@/components/profile-settings";
import { ShopPanel } from "@/components/shop-panel";
import { ComfortPlayer } from "@/components/comfort-player";
import type { InventoryItem, ShopItem, WorkShiftView } from "@/lib/types";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("next/image", () => ({ default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => {
  const clean = { ...props };
  delete clean.fill; delete clean.unoptimized;
  // This image double inspects the exact URL passed to Next Image.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...clean} alt={props.alt} />;
} }));

const fetchMock = vi.fn();
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const failure = (error: string, status = 503) => ({ ok: false, status, json: async () => ({ error }) });
const emptyWork = { shifts: [], earnedToday: 0, dailyLimit: 80 };
const shift: WorkShiftView = { id: "shift-1", kind: "SHIFT_30M", status: "ACTIVE", reward: 10, characterId: "akari", startedAt: new Date(0).toISOString(), endsAt: new Date(Date.now() + 2000).toISOString() };

beforeEach(() => { fetchMock.mockReset(); mocks.refresh.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("work dispatch", () => {
  it("restores an active shift and unlocks its claim only after countdown", async () => {
    vi.useFakeTimers();
    const active = { ...shift, endsAt: new Date(Date.now() + 2000).toISOString() };
    fetchMock.mockResolvedValueOnce(ok({ ...emptyWork, shifts: [active] })).mockResolvedValueOnce(ok({ shift: { ...active, status: "CLAIMED" } }));
    await act(async () => { render(<WorkDesk locale="en" characters={[{ id: "akari", name: "Akari" }]} />); });
    expect(screen.getByRole("timer")).toHaveTextContent("00:00:02");
    expect(screen.getByRole("button", { name: "Claim shift reward" })).toBeDisabled();
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.getByRole("button", { name: "Claim shift reward" })).toBeEnabled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Claim shift reward" })); });
    const [url, request] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/jobs/shift-1/claim");
    expect(JSON.parse(request.body).idempotencyKey).toBe(request.headers["Idempotency-Key"]);
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(screen.getByText(/10 \/ 80 SUP/)).toBeInTheDocument();
  });

  it("sends the supported kind and chosen character, preserving its key after a network failure", async () => {
    fetchMock.mockResolvedValueOnce(ok(emptyWork)).mockRejectedValueOnce(new TypeError("Network unavailable")).mockResolvedValueOnce(ok(shift));
    render(<WorkDesk locale="en" characters={[{ id: "akari", name: "Akari" }]} />);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Start shift" })[0]).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Dispatch character (optional)"), { target: { value: "akari" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Start shift" })[0]);
    await screen.findByText("Network unavailable");
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Start shift" })[0]).toBeEnabled());
    fireEvent.click(screen.getAllByRole("button", { name: "Start shift" })[0]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await screen.findByText(/Shift started/);
    const first = fetchMock.mock.calls[1][1];
    const retry = fetchMock.mock.calls[2][1];
    expect(JSON.parse(first.body)).toMatchObject({ kind: "SHIFT_30M", characterId: "akari" });
    expect(first.headers["Idempotency-Key"]).toBe(retry.headers["Idempotency-Key"]);
  });

  it("blocks new shifts until restore succeeds and observes the daily limit", async () => {
    fetchMock.mockResolvedValueOnce(failure("Sign in to restore", 401)).mockResolvedValueOnce(ok({ ...emptyWork, earnedToday: 70, shifts: [{ ...shift, status: "CLAIMED", reward: 70 }] }));
    render(<WorkDesk locale="en" />);
    await screen.findByText("Sign in to restore");
    expect(screen.getAllByRole("button", { name: "Start shift" }).every((button) => button.hasAttribute("disabled"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Refresh shifts" }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Start shift" })[0]).toBeEnabled());
    expect(screen.getAllByRole("button", { name: "Start shift" })[1]).toBeDisabled();
  });

  it("retains the same claim key when completion was not received", async () => {
    fetchMock.mockResolvedValueOnce(ok({ ...emptyWork, dayKey: "2026-11-04", shifts: [{ ...shift, dayKey: "2026-11-03", status: "READY" }] })).mockRejectedValueOnce(new Error("Lost claim response")).mockResolvedValueOnce(ok({ shift: { ...shift, dayKey: "2026-11-03", status: "CLAIMED" } }));
    render(<WorkDesk locale="en" />);
    fireEvent.click(await screen.findByRole("button", { name: "Claim shift reward" }));
    await screen.findByText("Lost claim response");
    await waitFor(() => expect(screen.getByRole("button", { name: "Claim shift reward" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Claim shift reward" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await screen.findByText(/SUP claimed/);
    expect(screen.getByText(/10 \/ 80 SUP/)).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[2][1].body);
  });
});

describe("rewarded ad sessions", () => {
  it("starts without JSON, waits for mock playback, and reuses nonce/key on completion retry", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(ok({ nonce: "valid-test-nonce-123", provider: "mock", slot: 1, expiresAt: new Date(Date.now() + 60000).toISOString() })).mockRejectedValueOnce(new Error("Lost ad response")).mockResolvedValueOnce(ok({ amount: 20 }));
    await act(async () => { render(<RewardClaimPanel locale="en" />); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /ad/i })); });
    expect(fetchMock.mock.calls[0]).toEqual(["/api/rewards/ad/start", { method: "POST" }]);
    expect(screen.getByRole("button", { name: "Complete mock ad" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(5000); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Complete mock ad" })); });
    expect(screen.getByRole("status")).toHaveTextContent("Lost ad response");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Complete mock ad" })); });
    const [url, request] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/rewards/ad/complete");
    expect(JSON.parse(request.body)).toEqual({ nonce: "valid-test-nonce-123", idempotencyKey: request.headers["Idempotency-Key"] });
    expect(request.headers["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(fetchMock.mock.calls[2][1].body).toBe(request.body);
    expect(fetchMock.mock.calls.some(([endpoint]) => endpoint === "/api/rewards/ad-claim")).toBe(false);
  });

  it("never completes nonmock or expired sessions", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(failure("Provider unavailable")).mockResolvedValueOnce(ok({ nonce: "expired-nonce-123456", provider: "mock", slot: 1, expiresAt: new Date(Date.now() + 1000).toISOString() }));
    await act(async () => { render(<RewardClaimPanel locale="en" />); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /ad/i })); });
    expect(screen.getByRole("status")).toHaveTextContent("Provider unavailable");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /ad/i })); });
    await act(async () => { vi.advanceTimersByTime(6000); });
    expect(screen.getByRole("button", { name: "Complete mock ad" })).toBeDisabled();
    expect(screen.getByRole("timer")).toHaveTextContent("Session expired");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("profile settings", () => {
  const profile = { displayName: "Fan", bio: "Hello", holdingsVisibility: true, favoriteTags: ["Music"], pinnedCharacterIds: ["a", "b"] };
  const characters = [{ id: "a", name: "Akari" }, { id: "b", name: "Mira" }];
  it("saves privacy independently from public pins and preserves draft edits on network errors", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(ok({ profile }));
    render(<ProfileSettings profile={profile} characters={characters} locale="en" />);
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "New Fan" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Save profile & privacy" }));
    await screen.findByText("Offline");
    expect(screen.getByLabelText("Display name")).toHaveValue("New Fan");
    await waitFor(() => expect(screen.getByRole("button", { name: "Save profile & privacy" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Save profile & privacy" }));
    await screen.findByText("Profile and privacy saved.");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/me/profile");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ displayName: "New Fan", bio: "Hello", holdingsVisibility: false, favoriteTags: ["Music"] });
  });
  it("saves pins in their chosen order and caps the shelf at six", async () => {
    fetchMock.mockResolvedValue(ok({ profile }));
    render(<ProfileSettings profile={profile} characters={characters} locale="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Move Mira up" }));
    fireEvent.click(screen.getByRole("button", { name: "Save pins" }));
    await screen.findByText("Pinned favorites saved in this order.");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ characterIds: ["b", "a"] });
    cleanup();
    render(<ProfileSettings profile={{ ...profile, pinnedCharacterIds: ["a", "b", "c", "d", "e", "f"] }} characters={characters} locale="en" />);
    expect(screen.getByLabelText("Add a favorite")).toBeDisabled();
  });
});

describe("cosmetics and comfort", () => {
  const item: ShopItem = { id: "frame", collectionId: "c", slug: "frame", title: "Test frame", description: "A frame", kind: "AVATAR_FRAME", currencyType: "SOFT", price: 10, previewLabel: "Preview", unlockPayload: { assetId: "asset-frame", previewUrl: "https://unpublished.invalid/private.png" }, published: true };
  const inventory: Array<InventoryItem & { item: ShopItem }> = [{ id: "inventory", userId: "u", shopItemId: item.id, equipped: true, createdAt: "", item }];
  const assets = [{ id: "asset-frame", kind: "AVATAR_FRAME", url: "/assets/frame.svg", alt: "Published frame", label: "Frame" }];
  it("uses the real profile for equipped state, previews without spending, and equips owned items", async () => {
    fetchMock.mockResolvedValue(ok({}));
    render(<ShopPanel items={[item]} inventory={inventory} profile={{ displayName: "Fan" }} assets={assets} locale="en" />);
    const equip = screen.getByRole("button", { name: /equip/i });
    expect(equip).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Preview in my room" }));
    expect(screen.getByText(/Preview only/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.querySelector('img[src*="unpublished.invalid"]')).toBeNull();
    fireEvent.click(equip);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/me/inventory/frame/equip");
  });
  it("disables the item that matches the equipped profile asset", () => {
    render(<ShopPanel items={[item]} inventory={inventory} profile={{ displayName: "Fan", equippedFrameAsset: "asset-frame" }} assets={assets} locale="en" />);
    expect(screen.getByRole("button", { name: /equipped/i })).toBeDisabled();
  });
  it("prefers a selected audio recording and labels the browser fallback after a playback error", () => {
    render(<ComfortPlayer locale="en" modeSlug="sleep" line="Rest here" audio={{ id: "audio", kind: "VOICE", url: "/assets/comfort/recording.mp3", alt: "Recording", label: "Published recording" }} />);
    const audio = screen.getByLabelText("Comfort audio");
    expect(audio).toHaveAttribute("src", "/assets/comfort/recording.mp3");
    expect(screen.queryByRole("button", { name: "Read with browser voice" })).not.toBeInTheDocument();
    fireEvent.error(audio);
    expect(screen.getByText(/Fallback: browser speech synthesis/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Read with browser voice" })).toBeInTheDocument();
  });
  it("catches comfort save/reaction failures instead of leaving an unhandled promise", async () => {
    fetchMock.mockRejectedValue(new Error("Comfort offline"));
    render(<ComfortPlayer locale="en" modeSlug="sleep" line="Rest here" />);
    fireEvent.click(screen.getByRole("button", { name: "Keep this moment" }));
    await screen.findByText("Comfort offline");
    await waitFor(() => expect(screen.getByRole("button", { name: "I feel softer" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "I feel softer" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toBe("/api/comfort/reaction");
  });
});
