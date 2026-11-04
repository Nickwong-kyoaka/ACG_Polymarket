import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PostComposer } from "@/components/post-composer";

beforeEach(() => { localStorage.clear(); vi.stubGlobal("fetch", vi.fn()); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function fill() {
  fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "My title" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Note" }), { target: { value: "My writing is kept here." } });
}
function saved(status = "DRAFT", timestamp?: string) {
  return new Response(JSON.stringify({ post: { id: "saved-post", slug: "saved-slug", status, updatedAt: timestamp } }), { status: 200 });
}

it("shows only actual successful response timestamps and retains the last confirmed save after failure", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(saved("DRAFT", "2026-11-04T08:15:00.000Z")).mockRejectedValueOnce(new TypeError("offline"));
  const view = render(<PostComposer locale="en" characters={[]} topics={[]} />);
  fill();
  expect(view.container.querySelector("time")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(view.container.querySelector("time")).toHaveAttribute("dateTime", "2026-11-04T08:15:00.000Z"));
  expect(screen.queryByText("You have unsaved changes.")).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Note" }), { target: { value: "More writing" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText("Connection lost. Your writing is still here; please try again.");
  expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("More writing");
  expect(view.container.querySelector("time")).toHaveAttribute("dateTime", "2026-11-04T08:15:00.000Z");
  expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();
  expect(vi.mocked(fetch).mock.calls[1][0]).toBe("/api/posts/saved-post");
  expect(vi.mocked(fetch).mock.calls[1][1]?.method).toBe("PATCH");
});

it("does not invent a time for a successful response without a timestamp", async () => {
  vi.mocked(fetch).mockResolvedValue(saved());
  const view = render(<PostComposer locale="en" characters={[]} topics={[]} />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(screen.getAllByText("Draft saved")).toHaveLength(2));
  expect(view.container.querySelector("time")).toBeNull();
  expect(screen.getByText("No confirmed save timestamp")).toBeInTheDocument();
});

it("prevents simultaneous saves and keeps edits made while the request is pending unsaved", async () => {
  let resolve!: (response: Response) => void;
  vi.mocked(fetch).mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
  const view = render(<PostComposer locale="en" characters={[]} topics={[]} />);
  fill();
  const form = view.container.querySelector("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Import browser draft" })).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox", { name: "Note" }), { target: { value: "Edited while saving" } });
  await act(async () => resolve(saved("PENDING_REVIEW", "2026-11-04T09:00:00Z")));
  expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("Edited while saving");
});

it("distinguishes submitted text and images awaiting review without offering a public preview", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ post: { id: "one", status: "PENDING_REVIEW", createdAt: "2026-11-04T09:00:00Z" }, moderation: { reason: "NEW_MEDIA_REVIEW" } })));
  render(<PostComposer locale="en" characters={[]} topics={[]} />);
  fill();
  fireEvent.change(screen.getByRole("textbox", { name: "Image URL" }), { target: { value: "https://example.test/new.jpg" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Original source page" }), { target: { value: "https://example.test/source" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Creator / source label" }), { target: { value: "Artist" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Alt text" }), { target: { value: "A character" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit note" }));
  await screen.findByText("Images: awaiting review, not public.");
  expect(screen.getByText("Your note is not public yet. Review results appear in notifications.")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Open note" })).not.toBeInTheDocument();
  const input = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
  expect(input.intent).toBe("SUBMIT");
  expect(input.media[0]).toEqual({ publicUrl: "https://example.test/new.jpg", sourceUrl: "https://example.test/source", sourceLabel: "Artist", altText: "A character" });
});

it("offers a public link only after a confirmed published response", async () => {
  vi.mocked(fetch).mockResolvedValue(saved("PUBLISHED", "2026-11-04T09:00:00Z"));
  render(<PostComposer locale="en" characters={[]} topics={[]} />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Submit note" }));
  expect(await screen.findByRole("link", { name: "Open note" })).toHaveAttribute("href", "/en/posts/saved-slug");
});

it.each([401, 403, 404, 409, 422, 500])("preserves writing after HTTP %i without claiming a successful save", async (status) => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: "internal technical details" }), { status }));
  const view = render(<PostComposer locale="en" characters={[]} topics={[]} />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled());
  expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("My writing is kept here.");
  expect(view.container.querySelector("time")).toBeNull();
  expect(screen.getByText("Not saved to server yet")).toBeInTheDocument();
  expect(screen.queryByText("internal technical details")).not.toBeInTheDocument();
});

it("handles disabled local storage without losing text or blocking a server save", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("disabled", "SecurityError"); });
  vi.mocked(fetch).mockResolvedValue(saved("DRAFT", "2026-11-04T09:00:00Z"));
  render(<PostComposer locale="en" characters={[]} topics={[]} />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Import browser draft" }));
  expect(screen.getByText(/Storage may be disabled/)).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("My writing is kept here.");
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(screen.getAllByText("Draft saved")).toHaveLength(2));
});

it("labels imported local text as unsaved and does not fake a server timestamp", () => {
  localStorage.setItem("acg-post-draft-en", JSON.stringify({ title: "Local title", body: "Local writing" }));
  const view = render(<PostComposer locale="en" characters={[]} topics={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Import browser draft" }));
  expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("Local writing");
  expect(screen.getByText(/This copy is not saved to the server/)).toBeInTheDocument();
  expect(view.container.querySelector("time")).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it("does not claim malformed success responses were saved", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response("{}"));
  const view = render(<PostComposer locale="en" characters={[]} topics={[]} />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText(/server response was incomplete/);
  expect(view.container.querySelector("time")).toBeNull();
  expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("My writing is kept here.");
});
