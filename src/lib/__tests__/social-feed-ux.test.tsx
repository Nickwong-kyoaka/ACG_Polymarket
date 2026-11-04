import { Activity, type AnchorHTMLAttributes } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SocialFeed } from "@/components/social-feed";
import { SocialPostDetail } from "@/components/social-post-detail";
import { feedErrorMessage, feedSessionKey, FeedRequestError, readFeedPosition, writeFeedPosition } from "@/components/social-feed-session";
import { normalizeSocialNote } from "@/components/social-note-types";

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const subscribe = (listener: () => void) => {
    window.addEventListener("test-navigation", listener);
    return () => window.removeEventListener("test-navigation", listener);
  };
  return {
    useSearchParams: () => new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search)),
    usePathname: () => useSyncExternalStore(subscribe, () => window.location.pathname),
  };
});
vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean; scroll?: boolean }) => {
  const clean = { ...props };
  delete clean.prefetch;
  delete clean.scroll;
  return <a {...clean} onClick={(event) => event.preventDefault()} />;
} }));
vi.mock("@/components/follow-button", () => ({ FollowButton: () => null }));
vi.mock("@/components/share-button", () => ({ ShareButton: () => null }));
vi.mock("@/components/post-conversation", () => ({ PostConversation: () => null }));

function rawNote(id: string, url: string | null = null) {
  return { id, slug: id, title: `Note ${id}`, body: `Public text ${id}`, author: { id: "author", displayName: "Author", handle: "author" }, media: url ? [{ id: `media-${id}`, url }] : [] };
}
function response(items: ReturnType<typeof rawNote>[], nextCursor: string | null = null) {
  return new Response(JSON.stringify({ items, nextCursor }), { status: 200 });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const initialItems = [normalizeSocialNote(rawNote("stale", "https://example.test/pulled.jpg"))!];
const props = { locale: "en" as const, signedIn: true, viewerId: "alice", initialItems };

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, "", "/en/community?feed=seasonal");
  const replace = window.history.replaceState.bind(window.history);
  vi.spyOn(window.history, "replaceState").mockImplementation((data, unused, url) => {
    replace(data, unused, url);
    window.dispatchEvent(new Event("test-navigation"));
  });
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
  Object.defineProperty(window, "scrollY", { configurable: true, value: 640 });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("safe feed return navigation", () => {
  it("revalidates every loaded page, restores its anchor and current cursor, and never renders cached media", async () => {
    let secondTop = 160;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const top = this.dataset.feedNote === "one" ? -500 : secondTop;
      return { top, bottom: top + 300, x: 0, y: top, width: 200, height: 300, left: 0, right: 200, toJSON() {} };
    });
    const fetcher = vi.mocked(fetch);
    fetcher.mockResolvedValueOnce(response([rawNote("one", "https://example.test/old.jpg")], "old-page-two"));
    fetcher.mockResolvedValueOnce(response([rawNote("two")], "old-page-three"));
    const first = render(<SocialFeed {...props} />);
    await screen.findByRole("heading", { name: "Note one" });
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByRole("heading", { name: "Note two" });
    expect(screen.getAllByRole("link", { name: "Note two" })[0]).toHaveAttribute("href", "/en/posts/two?feed=seasonal&feedFrom=community");
    fireEvent.scroll(window);
    const key = feedSessionKey("user:alice", "en", "/community", "seasonal")!;
    expect(readFeedPosition(key)).toEqual({ pages: 2, anchor: { id: "two", top: 160 }, scrollY: 640 });
    expect(sessionStorage.getItem(key)).not.toMatch(/Public text|https:|old-page/);
    first.unmount();

    const pending = deferred<Response>();
    fetcher.mockReset().mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(response([rawNote("two")], "fresh-page-three"))
      .mockResolvedValueOnce(response([rawNote("three")]));
    secondTop = 200;
    const restored = render(<SocialFeed {...props} />);
    expect(screen.queryByRole("heading", { name: "Note one" })).not.toBeInTheDocument();
    expect(restored.container.innerHTML).not.toContain("old.jpg");
    expect(restored.container.innerHTML).not.toContain("pulled.jpg");
    await act(async () => pending.resolve(response([rawNote("one")], "fresh-page-two")));
    await screen.findByRole("heading", { name: "Note two" });
    expect(String(fetcher.mock.calls[1][0])).toContain("cursor=fresh-page-two");
    expect(restored.container.innerHTML).not.toContain("old.jpg");
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 680, behavior: "instant" }));
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByRole("heading", { name: "Note three" });
    expect(String(fetcher.mock.calls[2][0])).toContain("cursor=fresh-page-three");
  });

  it("isolates accounts and ignores late requests from the previous viewer", async () => {
    writeFeedPosition(feedSessionKey("user:alice", "en", "/community", "following"), { pages: 2, anchor: null, scrollY: 400 });
    window.history.replaceState(null, "", "/en/community?feed=following");
    const pending = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response([rawNote("bob")]));
    const view = render(<SocialFeed {...props} />);
    view.rerender(<SocialFeed {...props} viewerId="bob" />);
    await screen.findByRole("heading", { name: "Note bob" });
    await act(async () => pending.resolve(response([rawNote("alice")], "alice-private-cursor")));
    expect(screen.queryByRole("heading", { name: "Note alice" })).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
    fireEvent.scroll(window);
    expect(readFeedPosition(feedSessionKey("user:bob", "en", "/community", "following"))?.pages).toBe(1);
    expect(readFeedPosition(feedSessionKey("user:alice", "en", "/community", "following"))?.pages).toBe(2);
  });

  it("keeps tabs in the URL, supports roving focus, and preserves feed context across locales", async () => {
    vi.mocked(fetch).mockImplementation(async () => response([]));
    const view = render(<SocialFeed {...props} />);
    await screen.findByRole("heading", { name: "No seasonal notes yet" });
    const selected = screen.getByRole("tab", { name: "Seasonal" });
    selected.focus();
    fireEvent.keyDown(selected, { key: "Home" });
    await waitFor(() => expect(screen.getByRole("tab", { name: "For you" })).toHaveFocus());
    expect(window.location.search).toBe("?feed=for-you");
    fireEvent.keyDown(screen.getByRole("tab", { name: "For you" }), { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Following" })).toHaveFocus());
    expect(screen.getByRole("tab", { name: "Following" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Seasonal" })).toHaveAttribute("tabindex", "-1");
    await act(async () => window.history.replaceState(null, "", "/zh-Hant/community?feed=following"));
    view.rerender(<SocialFeed {...props} locale="zh-Hant" />);
    await screen.findByRole("heading", { name: "暫無關注更新" });
    expect(screen.getByRole("tab", { name: "正在關注" })).toHaveAttribute("aria-selected", "true");
    expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain("locale=zh-Hant&feed=following");
  });

  it("does not cache an unidentified signed-in viewer or fetch a guest following feed", async () => {
    window.history.replaceState(null, "", "/en/community?feed=following");
    const view = render(<SocialFeed {...props} signedIn={false} viewerId={undefined} />);
    await screen.findByRole("heading", { name: "Sign in to see followed content" });
    expect(fetch).not.toHaveBeenCalled();
    vi.mocked(fetch).mockResolvedValue(response([rawNote("one")]));
    view.rerender(<SocialFeed {...props} viewerId={undefined} />);
    await screen.findByRole("heading", { name: "Note one" });
    fireEvent.scroll(window);
    expect(sessionStorage.length).toBe(0);
  });

  it("clears retained route state before an Activity reveal and revalidates browser-cache returns", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response([rawNote("one", "https://example.test/old.jpg")]));
    const view = render(<Activity mode="visible"><SocialFeed {...props} /></Activity>);
    await screen.findByRole("heading", { name: "Note one" });
    fireEvent.scroll(window);
    view.rerender(<Activity mode="hidden"><SocialFeed {...props} /></Activity>);
    const pending = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(pending.promise);
    view.rerender(<Activity mode="visible"><SocialFeed {...props} /></Activity>);
    expect(view.container.innerHTML).not.toContain("old.jpg");
    expect(screen.queryByRole("heading", { name: "Note one" })).not.toBeInTheDocument();
    await act(async () => pending.resolve(response([rawNote("one")])));
    await screen.findByRole("heading", { name: "Note one" });
    const browserReturn = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(browserReturn.promise);
    fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));
    expect(screen.queryByRole("heading", { name: "Note one" })).not.toBeInTheDocument();
    await act(async () => browserReturn.resolve(response([])));
    await screen.findByRole("heading", { name: "No seasonal notes yet" });
  });

  it("retains the original page target after a partial restore fails, then retries from a verified cursor", async () => {
    writeFeedPosition(feedSessionKey("user:alice", "en", "/community", "seasonal"), { pages: 2, anchor: { id: "two", top: 100 }, scrollY: 640 });
    vi.mocked(fetch).mockResolvedValueOnce(response([rawNote("one")], "current-page-two"))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(response([rawNote("two")]));
    render(<SocialFeed {...props} />);
    await screen.findByRole("alert");
    expect(screen.getByRole("heading", { name: "Note one" })).toBeInTheDocument();
    fireEvent.scroll(window);
    expect(readFeedPosition(feedSessionKey("user:alice", "en", "/community", "seasonal"))?.pages).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Retry loading more" }));
    await screen.findByRole("heading", { name: "Note two" });
    expect(String(vi.mocked(fetch).mock.calls[2][0])).toContain("cursor=current-page-two");
  });
});

describe("feed failure and empty recovery", () => {
  it("shows a retry on rejected fetch without falling back to stale initial content", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline")).mockResolvedValueOnce(response([]));
    const view = render(<SocialFeed {...props} />);
    await screen.findByRole("alert");
    expect(view.container.innerHTML).not.toContain("pulled.jpg");
    expect(screen.queryByRole("heading", { name: "Note stale" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("heading", { name: "No seasonal notes yet" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("preserves verified items and the cursor when loading more fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response([rawNote("one")], "page-two"))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(response([rawNote("two")]));
    render(<SocialFeed {...props} />);
    await screen.findByRole("heading", { name: "Note one" });
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("heading", { name: "Note one" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry loading more" }));
    await screen.findByRole("heading", { name: "Note two" });
    expect(String(vi.mocked(fetch).mock.calls[2][0])).toContain("cursor=page-two");
  });

  it("works when session storage is disabled", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("disabled"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("disabled"); });
    vi.mocked(fetch).mockResolvedValue(response([rawNote("one")]));
    render(<SocialFeed {...props} />);
    await screen.findByRole("heading", { name: "Note one" });
    expect(() => fireEvent.scroll(window)).not.toThrow();
  });

  it.each([401, 403, 404, 409, 500])("handles HTTP %i with direct bilingual copy", async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status }));
    render(<SocialFeed {...props} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(feedErrorMessage(new FeedRequestError(status), false));
    expect(feedErrorMessage(new FeedRequestError(status), true)).not.toBe(feedErrorMessage(new FeedRequestError(status), false));
  });

  it("returns from a post to the original home feed and handles a rejected save", async () => {
    window.history.replaceState(null, "", "/en/posts/one?feed=following&feedFrom=home");
    vi.mocked(fetch).mockRejectedValue(new TypeError("offline"));
    render(<SocialPostDetail note={normalizeSocialNote(rawNote("one"))!} comments={[]} locale="en" signedIn canModerate={false} />);
    expect(screen.getByRole("link", { name: "Back to feed" })).toHaveAttribute("href", "/en?feed=following");
    fireEvent.click(screen.getByRole("button", { name: /Save ·/ }));
    expect(await screen.findByRole("status")).toHaveTextContent("Connection lost. Please retry.");
    expect(screen.getByRole("button", { name: /Save ·/ })).toBeEnabled();
  });
});
