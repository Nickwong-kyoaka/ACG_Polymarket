import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), notes: vi.fn(), preferences: vi.fn(), unread: vi.fn(), search: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { notification: { findMany: mocks.notes, count: mocks.unread }, notificationPreference: { findUnique: mocks.preferences } } }));
vi.mock("@/lib/public-search", async (original) => ({ ...await original<typeof import("@/lib/public-search")>(), searchPublicContent: mocks.search }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, usePathname: () => "/zh-Hant/community" }));
vi.mock("@/components/notification-center", () => ({ NotificationCenter: (props: { initialItems: unknown[]; initialNextCursor: string; initialUnreadCount: number }) => <div data-testid="inbox-props">{JSON.stringify(props)}</div> }));

import NotificationsPage from "@/app/[locale]/me/notifications/page";
import SearchPage from "@/app/[locale]/search/page";
import { SiteHeader } from "@/components/site-header";

beforeEach(() => { vi.stubEnv("FEATURE_COMMUNITY", "true"); vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "viewer" } }); mocks.preferences.mockResolvedValue(null); mocks.unread.mockResolvedValue(42); mocks.notes.mockResolvedValue([]); mocks.search.mockResolvedValue({ query: "room", characters: [], posts: [], series: [] }); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("localized inbox and discovery pages", () => {
  it("renders a bounded first notification page and a next cursor without user IDs", async () => {
    mocks.notes.mockResolvedValue(Array.from({ length: 21 }, (_, index) => ({ id: `note-${index}`, title: "Daily reward claimed", body: "You received 100 SUP.", type: "REWARD", locale: "EN", metadata: { amount: 100 }, href: "/work", createdAt: new Date(), readAt: null })));
    render(await NotificationsPage({ params: Promise.resolve({ locale: "zh-Hant" }) }));
    const props = JSON.parse(screen.getByTestId("inbox-props").textContent!);
    expect(props.initialItems).toHaveLength(20);
    expect(props.initialNextCursor).toBe("note-19");
    expect(props.initialUnreadCount).toBe(42);
    expect(props.initialItems[0].metadata).toEqual({ amount: 100 });
    const query = mocks.notes.mock.calls[0][0];
    expect(query).toMatchObject({ where: { userId: "viewer" }, take: 21, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    expect(query.select).not.toHaveProperty("userId");
  });
  it("does not query any notifications for signed-out visitors", async () => {
    mocks.auth.mockResolvedValue(null);
    render(await NotificationsPage({ params: Promise.resolve({ locale: "zh-Hant" }) }));
    expect(screen.getByRole("link", { name: "前往登入" })).toHaveAttribute("href", "/zh-Hant/onboarding");
    expect(mocks.notes).not.toHaveBeenCalled();
  });
  it("uses q for combined search, renders localized URLs and preserves authored post titles", async () => {
    mocks.search.mockResolvedValue({ query: "room", characters: [{ id: "c", slug: "akari", title: "明里", summary: "角色簡介" }], posts: [{ id: "p", slug: "my-note", title: "An English fan note", summary: "Authored text" }], series: [{ id: "s", slug: "signal", title: "訊號", summary: "作品簡介" }] });
    render(await SearchPage({ params: Promise.resolve({ locale: "zh-Hant" }), searchParams: Promise.resolve({ q: "  room  " }) }));
    expect(mocks.search).toHaveBeenCalledWith("room", "zh-Hant");
    expect(screen.getByRole("searchbox", { name: "搜尋關鍵字" })).toHaveValue("room");
    expect(screen.getByRole("link", { name: /明里/ })).toHaveAttribute("href", "/zh-Hant/character/akari");
    expect(screen.getByRole("link", { name: /An English fan note/ })).toHaveAttribute("href", "/zh-Hant/posts/my-note");
    expect(screen.getByRole("link", { name: /訊號/ })).toHaveAttribute("href", "/zh-Hant/series/signal");
  });
  it("provides a search entry in the header without adding a desktop-only control", () => {
    render(<SiteHeader />);
    const entry = screen.getByRole("link", { name: "搜尋角色、貼文與作品" });
    expect(entry).toHaveAttribute("href", "/zh-Hant/search");
    expect(entry.className).not.toContain("hidden");
  });
  it("does not advertise community search or navigation when community is disabled", async () => {
    vi.stubEnv("FEATURE_COMMUNITY", "false");
    mocks.search.mockResolvedValue({ query: "room", characters: [], posts: [{ id: "hidden", slug: "hidden", title: "Hidden community post", summary: "Hidden" }], series: [] });
    render(await SearchPage({ params: Promise.resolve({ locale: "zh-Hant" }), searchParams: Promise.resolve({ q: "room" }) }));
    expect(screen.queryByRole("link", { name: /Hidden community post/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /社群貼文/ })).not.toBeInTheDocument();
    cleanup();
    render(<SiteHeader features={{ community: false, predictions: false, submissions: false }} />);
    expect(screen.getByRole("link", { name: "搜尋角色與作品" })).toHaveAttribute("href", "/zh-Hant/search");
    expect(screen.queryByRole("link", { name: "社群" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "預測" })).not.toBeInTheDocument();
  });
});
