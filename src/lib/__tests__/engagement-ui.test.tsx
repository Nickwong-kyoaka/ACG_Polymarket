import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "@/components/share-button";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { OnboardingPicker } from "@/components/onboarding-picker";

const mocks = vi.hoisted(() => ({ pathname: "/en/onboarding", push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
const fetchMock = vi.fn();
const copy = vi.fn();
beforeEach(() => {
  vi.clearAllMocks(); mocks.pathname = "/en/onboarding";
  window.history.replaceState(null, "", "/en/onboarding?utm_source=club&utm_medium=share&token=private-value");
  localStorage.clear();
  localStorage.setItem("acg-exchange-session", "test-session-0000-12345");
  localStorage.setItem("acg-exchange-attribution", JSON.stringify({ source: "club", medium: "share", entryPath: "/en/posts/hello" }));
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ accepted: true }) });
  vi.stubGlobal("fetch", fetchMock);
  copy.mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText: copy } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("best-effort engagement events", () => {
  it("records a successful clipboard share with attribution, not user text or query secrets", async () => {
    fetchMock.mockRejectedValue(new Error("Analytics offline"));
    render(<ShareButton title="My private-looking title" text="Do not collect this text" path="/en/posts/hello?tab=notes" locale="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Share: My private-looking title" }));
    await screen.findByText("Copied");
    expect(copy).toHaveBeenCalledWith(expect.stringContaining("ref=share"));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ name: "SHARE", sessionKey: "test-session-0000-12345", source: "club", locale: "en", path: "/en/posts/hello", metadata: { method: "clipboard", entryPath: "/en/posts/hello", utmMedium: "share" } });
    expect(JSON.stringify(body)).not.toContain("private-value");
    expect(JSON.stringify(body)).not.toContain("Do not collect this text");
    expect(screen.queryByText("Copy unavailable")).not.toBeInTheDocument();
  });
  it("records native shares, but not user cancellation or failed copies", async () => {
    const native = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new DOMException("Cancelled", "AbortError"));
    vi.stubGlobal("navigator", { share: native, clipboard: { writeText: copy } });
    render(<ShareButton title="A post" text="Text" path="/en/posts/hello" locale="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Share: A post" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).metadata.method).toBe("native");
    fireEvent.click(screen.getByRole("button", { name: "Share: A post" }));
    await waitFor(() => expect(native).toHaveBeenCalledTimes(2));
    expect(copy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("survives disabled storage and network failures without breaking the beacon", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    fetchMock.mockRejectedValue(new Error("Analytics offline"));
    render(<StrictMode><AnalyticsBeacon /></StrictMode>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const events = fetchMock.mock.calls.map(([, request]) => JSON.parse(request.body));
    expect(events.map((event) => event.name)).toEqual(["PAGE_VIEW", "ONBOARDING_STARTED"]);
    expect(events.every((event) => event.sessionKey.length >= 16)).toBe(true);
    expect(events.every((event) => event.path === "/en/onboarding")).toBe(true);
  });
  it("does not collect admin page views", () => {
    mocks.pathname = "/zh-Hant/admin/posts";
    render(<AnalyticsBeacon />);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("finishes onboarding despite analytics rejection and links conversion attribution to its session", async () => {
    fetchMock.mockImplementation((url) => url === "/api/me/onboarding" ? Promise.resolve({ ok: true, json: async () => ({ profile: {} }) }) : Promise.reject(new Error("Analytics offline")));
    render(<OnboardingPicker locale="en" characters={[]} initialTags={["new-season"]} initialCharacterIds={["character"]} nextPath="/en/community" />);
    fireEvent.click(screen.getByRole("button", { name: "Finish and visit the clubroom" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/en/community"));
    expect(mocks.refresh).toHaveBeenCalled();
    const event = JSON.parse(fetchMock.mock.calls.find(([url]) => url === "/api/analytics")![1].body);
    expect(event).toMatchObject({ name: "ONBOARDING_COMPLETED", source: "club", sessionKey: "test-session-0000-12345", metadata: { emitter: "client-attribution", attributionOnly: true } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("catches onboarding network failures without losing selections or emitting conversion", async () => {
    fetchMock.mockRejectedValue(new Error("Offline"));
    render(<OnboardingPicker locale="en" characters={[]} initialTags={["new-season"]} initialCharacterIds={["character"]} nextPath="/en/community" />);
    fireEvent.click(screen.getByRole("button", { name: "Finish and visit the clubroom" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: /New season/ })).toHaveAttribute("aria-pressed", "true");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
