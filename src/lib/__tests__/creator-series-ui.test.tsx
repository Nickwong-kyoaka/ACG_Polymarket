import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreatorSeriesSelector } from "@/components/creator-series-selector";
import { CreatorSeriesSubscribe } from "@/components/creator-series-subscribe";
import { CreatorSeriesDesk } from "@/components/creator-series-desk";
import { PostComposer } from "@/components/post-composer";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
const fetchMock = vi.fn();

beforeEach(() => { fetchMock.mockReset(); mocks.refresh.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("creator series controls", () => {
  it("provides a controlled selector with private-series labels and a management link", () => {
    const onChange = vi.fn();
    render(<CreatorSeriesSelector locale="en" series={[{ id: "private", title: "Evening notes", published: false }]} value="" onChange={onChange} />);
    expect(screen.getByRole("option", { name: "Evening notes (private)" })).toHaveValue("private");
    fireEvent.change(screen.getByRole("combobox", { name: "Add to my series" }), { target: { value: "private" } });
    expect(onChange).toHaveBeenCalledWith("private");
    expect(screen.getByRole("link", { name: "Create or manage series" })).toHaveAttribute("href", "/en/me/series");
  });

  it("sends explicit subscription state and refreshes after success", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ subscribed: true }) });
    render(<CreatorSeriesSubscribe seriesId="series" locale="en" signedIn subscribed={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Subscribe to series" }));
    await screen.findByRole("button", { name: "Unsubscribe" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ subscribed: true });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/creator-series/series/subscribe");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("retains subscription state and surfaces server failures", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Sign in again." }) });
    render(<CreatorSeriesSubscribe seriesId="series" locale="en" signedIn subscribed />);
    fireEvent.click(screen.getByRole("button", { name: "Unsubscribe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign in again.");
    expect(screen.getByRole("button", { name: "Unsubscribe" })).toHaveAttribute("aria-pressed", "true");
  });

  it("offers sign-in rather than a mutation button for anonymous readers", () => {
    render(<CreatorSeriesSubscribe seriesId="series" locale="zh-Hant" signedIn={false} subscribed={false} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/zh-Hant/onboarding");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("creates private series by default without forging an owner", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ series: { id: "new" } }) });
    render(<CreatorSeriesDesk locale="en" series={[]} posts={[]} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Series title" }), { target: { value: "Evening notes" } });
    fireEvent.click(screen.getByRole("button", { name: "Create series" }));
    await screen.findByRole("status");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ title: "Evening notes", description: "", kind: "NOTE", published: false });
  });

  it("does not replace chapter membership when saving metadata", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ series: { id: "series" } }) });
    render(<CreatorSeriesDesk locale="en" series={[{ id: "series", slug: "notes", creatorId: "owner", title: "Notes", description: "", kind: "NOTE", published: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", postIds: ["post"], subscriberCount: 0 }]} posts={[{ id: "post", title: "A note", status: "DRAFT", creatorSeriesId: "series" }]} />);
    const section = screen.getByRole("button", { name: "Save settings" }).closest("section")!;
    fireEvent.change(within(section).getByRole("textbox", { name: "Title" }), { target: { value: "New title" } });
    fireEvent.click(within(section).getByRole("button", { name: "Save settings" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ title: "New title", description: "", kind: "NOTE", published: true });
  });

  it("submits the owned series selected through the create-page query", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ post: { id: "post", status: "DRAFT" } }) });
    render(<PostComposer locale="en" characters={[]} topics={[]} creatorSeries={[{ id: "series", title: "Notes", published: true }]} initialCreatorSeriesId="series" />);
    expect(screen.getByRole("combobox", { name: "Add to my series" })).toHaveValue("series");
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Chapter one" } });
    fireEvent.change(screen.getByRole("textbox", { name: /^Note/ }), { target: { value: "A new chapter for the selected series." } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByRole("status");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ creatorSeriesId: "series", intent: "DRAFT" });
  });

  it("preserves an edited post's series ahead of the query default and permits removing membership", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ post: { id: "post", status: "DRAFT" } }) });
    render(<PostComposer locale="en" characters={[]} topics={[]} creatorSeries={[{ id: "original", title: "Original", published: true }, { id: "query", title: "Query", published: true }]} initialCreatorSeriesId="query" initialPost={{ id: "post", title: "Existing chapter", body: "Existing text stays in place.", kind: "NOTE", primaryCharacterId: null, creatorSeriesId: "original", sourceUrl: null, aiGenerated: false, topics: [], media: [] }} />);
    const selector = screen.getByRole("combobox", { name: "Add to my series" });
    expect(selector).toHaveValue("original");
    fireEvent.change(selector, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByRole("status");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/posts/post");
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("creatorSeriesId");
  });
});
