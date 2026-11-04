import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CharacterSections } from "@/components/character-sections/character-sections";
import { CharacterSourceNotes, CharacterSourceStatus } from "@/components/character-sections/source-notes";
import { CharacterComfortSection } from "@/components/character-sections/comfort-section";
import type { PublicCharacterAsset } from "@/lib/public-assets";

beforeEach(() => window.history.replaceState(null, "", "/en/character/demo"));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const sections = [
  { id: "overview", label: "Overview", content: <p>Profile and attributes</p> },
  { id: "gallery", label: "Gallery", content: <p>Visuals</p> },
  { id: "notes", label: "Notes", anchors: ["comments"], content: <p id="comments">Comments and proposals</p> },
  { id: "support", label: "Support", content: <p>History and alerts</p> },
  { id: "comfort", label: "Comfort", content: <p>Browser demo</p> },
];
const asset: PublicCharacterAsset = { id: "asset", kind: "HERO", label: "Winter coat", storageKey: "assets/coat.webp", publicUrl: "https://cdn.example.org/coat.webp", altText: "Winter coat", sourceKind: "OFFICIAL_REFERENCE", permissionBadge: "UNVERIFIED", sourceLabel: "Official series website", sourceUrl: "https://example.org/character", licenseName: "No grant recorded" };

describe("character sections, sources and voice labels", () => {
  it("deep-links through query parameters, preserves other parameters and updates URL with keyboard tabs", async () => {
    window.history.replaceState(null, "", "/en/character/demo?ref=club&tab=gallery");
    render(<CharacterSections locale="en" sections={sections} />);
    const gallery = screen.getByRole("tab", { name: "Gallery" });
    expect(gallery).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Gallery" })).toHaveAttribute("id", gallery.getAttribute("aria-controls"));
    gallery.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Notes" })).toHaveFocus();
    expect(window.location.search).toBe("?ref=club&tab=notes");
    expect(window.location.hash).toBe("#notes");
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Comfort" })).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveFocus();
  });
  it("opens hash and descendant anchors, responds to history, and tolerates invalid fragments", () => {
    window.history.replaceState(null, "", "/en/character/demo?tab=gallery#comments");
    render(<CharacterSections locale="en" sections={sections} />);
    expect(screen.getByRole("tabpanel", { name: "Notes" })).toHaveTextContent("Comments and proposals");
    act(() => { window.history.replaceState(null, "", "?tab=support"); window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(screen.getByRole("tabpanel", { name: "Support" })).toBeVisible();
    act(() => { window.history.replaceState(null, "", "?tab=unknown#%E0%A4%A"); window.dispatchEvent(new Event("hashchange")); });
    expect(screen.getByRole("tabpanel", { name: "Overview" })).toBeVisible();
  });
  it("does not mount media and polling content until its section is selected", () => {
    const mounted = vi.fn();
    function Deferred() { mounted(); return <p>Deferred media</p>; }
    render(<CharacterSections locale="en" sections={[sections[0], { ...sections[1], content: <Deferred /> }]} />);
    expect(mounted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: "Gallery" }));
    expect(screen.getByText("Deferred media")).toBeVisible();
  });
  it.each(["en", "zh-Hant"] as const)("localizes unverified sources and exposes canonical links through expandable credits (%s)", async (locale) => {
    render(<CharacterSourceNotes locale={locale} characterSlug="demo" assets={[asset]} attribution={{ id: "a", characterId: "demo", sourceKind: "MANUAL", sourceLabel: "Series encyclopedia", sourceUrl: "https://example.org/canonical", licenseName: "Metadata source", attributionText: "Rewritten reference", importedAt: "2026-01-01" }} />);
    const summary = screen.getByText(locale === "en" ? "Sources, permissions & credits" : "來源、授權與鳴謝");
    await userEvent.click(summary);
    expect(screen.getByText(locale === "en" ? "Permission unverified" : "授權未驗證")).toBeVisible();
    expect(screen.getByRole("link", { name: locale === "en" ? "Canonical character source (new tab)" : "角色原始資料來源（另開分頁）" })).toHaveAttribute("href", "https://example.org/canonical");
    expect(screen.getByRole("link", { name: locale === "en" ? "Visual source (new tab)" : "圖片來源（另開分頁）" })).toHaveAttribute("href", "https://example.org/character");
    expect(screen.getByRole("link", { name: /takedown contact|下架聯絡/ })).toHaveAttribute("href", `/${locale}/gallery/demo`);
  });
  it("does not treat unknown status as permission, or unsafe source URLs as links", () => {
    render(<><CharacterSourceStatus locale="en" sourceKind="OFFICIAL_REFERENCE" /><CharacterSourceNotes locale="en" characterSlug="demo" assets={[{ ...asset, sourceUrl: "javascript:alert(1)" }]} /></>);
    expect(screen.getByText("Permission not recorded")).toBeVisible();
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(screen.getByText("No public source URL recorded")).toBeInTheDocument();
  });
  it.each(["en", "zh-Hant"] as const)("identifies synth playback as a browser demo and never promises character/performer speech (%s)", async (locale) => {
    const speak = vi.fn();
    vi.stubGlobal("speechSynthesis", { cancel: vi.fn(), getVoices: () => [], speak });
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
    render(<CharacterComfortSection locale={locale} characterSlug="demo" characterName="Demo" />);
    expect(screen.getByRole("heading", { name: locale === "en" ? "Browser speech demo" : "瀏覽器合成語音示範" })).toBeVisible();
    expect(screen.getByText(locale === "en" ? /This is not the character speaking/ : /並非角色本人發聲/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: locale === "en" ? "Play voice" : "播放語音" }));
    expect(speak).toHaveBeenCalledOnce();
  });
});
