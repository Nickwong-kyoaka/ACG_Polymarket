import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationCenter, type NotificationItem } from "@/components/notification-center";

const fetchMock = vi.fn();
const prefs = { followedContent: true, seriesUpdates: true, predictionChanges: true, predictionClosing: true, resolutions: true, moderationResults: true };
const note = (id: string): NotificationItem => ({ id, title: "Part-time shift complete", body: "You received 10 SUP.", type: "REWARD", href: "/en/work", readAt: null, createdAt: "2026-11-04T00:00:00.000Z" });
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("notification inbox interactions", () => {
  it("localizes title/body and reads next pages without duplicates or another locale's links", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ items: [note("1"), note("2")], nextCursor: null, unreadCount: 2 }) });
    render(<NotificationCenter initialItems={[note("1")]} initialPreferences={prefs} initialNextCursor="cursor /?" initialUnreadCount={2} locale="zh-Hant" />);
    expect(screen.getByRole("heading", { name: "打工完成" })).toBeInTheDocument();
    expect(screen.getByText("你已收到 10 SUP，獎勵已存入錢包。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打開內容" })).toHaveAttribute("href", "/zh-Hant/work");
    fireEvent.click(screen.getByRole("button", { name: "讀取下一頁" }));
    await waitFor(() => expect(screen.getAllByRole("heading", { name: "打工完成" })).toHaveLength(2));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/me/notifications?limit=20&cursor=cursor%20%2F%3F");
    expect(screen.queryByRole("button", { name: "讀取下一頁" })).not.toBeInTheDocument();
    expect(screen.getByText("目前已讀取所有便條。")).toBeInTheDocument();
  });
  it("keeps the current page and cursor when read-next fails, then retries safely", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ ok: true, json: async () => ({ items: [note("2")], nextCursor: null, unreadCount: 2 }) });
    render(<NotificationCenter initialItems={[note("1")]} initialPreferences={prefs} initialNextCursor="next" locale="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Read next notes" }));
    await screen.findByRole("status");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    await waitFor(() => expect(screen.getByRole("button", { name: "Read next notes" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Read next notes" }));
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(2));
    expect(fetchMock.mock.calls[0][0]).toBe(fetchMock.mock.calls[1][0]);
  });
  it("updates the global unread count only after a successful read and restores a failed preference", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false });
    render(<NotificationCenter initialItems={[note("1")]} initialPreferences={prefs} initialUnreadCount={5} locale="en" />);
    fireEvent.click(screen.getByRole("button", { name: /^Read$/ }));
    await screen.findByRole("status");
    expect(screen.getByText("5 unread notes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));
    await screen.findByText("0 unread notes");
    const preference = screen.getByLabelText("Followed creators and characters");
    fireEvent.click(preference);
    await waitFor(() => expect(preference).toBeChecked());
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ action: "PREFERENCES", preferences: { followedContent: false } });
  });
  it("does not allow simultaneous preference changes to overwrite another preference", async () => {
    let complete!: () => void;
    fetchMock.mockImplementation(() => new Promise((resolve) => { complete = () => resolve({ ok: true }); }));
    render(<NotificationCenter initialItems={[]} initialPreferences={prefs} locale="en" />);
    fireEvent.click(screen.getByLabelText("Followed creators and characters"));
    expect(screen.getByLabelText("Series and episode updates")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Series and episode updates"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    complete();
    await screen.findByText("Notification preference saved.");
    expect(screen.getByLabelText("Followed creators and characters")).not.toBeChecked();
    expect(screen.getByLabelText("Series and episode updates")).toBeChecked();
  });
});
