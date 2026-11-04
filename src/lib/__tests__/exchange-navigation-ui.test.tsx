import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localizedContextPath } from "@/lib/navigation-context";
import { SiteHeader } from "@/components/site-header";

const location = vi.hoisted(() => ({ path: "/en/market", query: "search=Tohka&season=2026+Summer&token=secret&range=7d" }));
vi.mock("next/navigation", () => ({ usePathname: () => location.path, useSearchParams: () => new URLSearchParams(location.query) }));
beforeEach(() => { location.path = "/en/market"; location.query = "search=Tohka&season=2026+Summer&token=secret&range=7d"; window.history.replaceState(null, "", "/en/market"); });
afterEach(cleanup);

describe("navigation context", () => {
  it("retains safe page state but never authentication parameters", () => {
    expect(localizedContextPath("zh-Hant", "/market", "search=Tohka&range=7d&token=secret&code=private&tab=gallery", "#season")).toBe("/zh-Hant/market?search=Tohka&range=7d&tab=gallery#season");
    expect(localizedContextPath("en", "/market", `search=${"x".repeat(501)}`, "#access_token=secret")).toBe("/en/market");
  });
  it("preserves outcome selection without making an execution request", () => {
    expect(localizedContextPath("zh-Hant", "/predictions/new-season", "outcome=NO&range=24h")).toBe("/zh-Hant/predictions/new-season?outcome=NO&range=24h");
  });
  it("preserves combined search, author review filters and feed return context", () => {
    expect(localizedContextPath("en", "/search", "q=Tohka&code=private")).toBe("/en/search?q=Tohka");
    expect(localizedContextPath("en", "/me/posts", "post=note-1&status=HELD")).toBe("/en/me/posts?post=note-1&status=HELD");
    expect(localizedContextPath("en", "/posts/note", "feed=following&feedFrom=home")).toBe("/en/posts/note?feed=following&feedFrom=home");
  });
  it("keeps a short primary navigation and a separate composer action", () => {
    render(<SiteHeader signedIn balance={300} unreadCount={2} />);
    const primary = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(primary).getAllByRole("link")).toHaveLength(4);
    expect(within(primary).getByRole("link", { name: "Characters" })).toHaveAttribute("aria-current", "page");
    const mobile = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(within(mobile).getByRole("link", { name: "Post" })).toHaveAttribute("href", "/en/create");
    expect(screen.getByRole("link", { name: "繁" })).toHaveAttribute("href", "/zh-Hant/market?search=Tohka&season=2026+Summer&range=7d");
    expect(screen.getByRole("link", { name: "Notifications, 2 unread" })).toBeInTheDocument();
  });
  it("honors feature flags and sends guests back to the intended composer after login", () => {
    render(<SiteHeader features={{ community: true, submissions: true, predictions: false }} />);
    expect(screen.queryByRole("link", { name: "Predictions" })).not.toBeInTheDocument();
    const mobile = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(within(mobile).getByRole("link", { name: "Post" })).toHaveAttribute("href", "/en/onboarding?next=%2Fen%2Fcreate");
    cleanup();
    render(<SiteHeader features={{ community: false, submissions: false, predictions: false }} />);
    expect(screen.queryByRole("link", { name: "Post" })).not.toBeInTheDocument();
  });
});
