import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CollectionDesk } from "@/components/collection-desk";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const shelf = {
  id: "shelf-1", slug: "evening-notes", title: "Evening notes", description: "For later", isPublic: true,
  previewItems: [{ id: "item-1", type: "post" as const, note: null, post: { id: "post-1", title: "An older note" } }],
};

it("links public shelves to the localized public page, but keeps private shelves private", () => {
  render(<CollectionDesk locale="en" collections={[shelf, { ...shelf, id: "shelf-2", isPublic: false }]} savedPosts={[]} />);
  expect(screen.getAllByRole("link", { name: "View public shelf" })).toHaveLength(1);
  expect(screen.getByRole("link", { name: "View public shelf" })).toHaveAttribute("href", "/en/collections/evening-notes");
});

it("can remove an existing note even after it is no longer in saved notes", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal("fetch", fetch);
  render(<CollectionDesk locale="en" collections={[shelf]} savedPosts={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const checkbox = screen.getByRole("checkbox", { name: "An older note" });
  expect(checkbox).toBeChecked();
  fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole("button", { name: "Save shelf" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  expect(JSON.parse(fetch.mock.calls[0][1].body).items).toEqual([]);
});
