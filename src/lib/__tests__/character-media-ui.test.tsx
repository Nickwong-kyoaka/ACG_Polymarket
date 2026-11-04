import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CharacterArt } from "@/components/character-art";
import { CharacterCard } from "@/components/character-card";
import type { Character } from "@/lib/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(cleanup);
const character: Character = {
  id: "demo", seriesId: "series", slug: "demo", name: "Demo", title: "A quiet signal", sourceTitle: "Signal series", summary: "A single biography.",
  fandomPrompt: "Kind notes", mood: "Calm", rightsType: "LICENSED", metadataOnly: true, basePrice: 12, priceStep: 1, unitsPerStep: 10,
  circulatingUnits: 0, supporterCount: 3, isFeatured: true, tags: [], accentFrom: "#fff", accentTo: "#ccc", relatedCharacterIds: [], attributeValues: [], assetIds: [], rightsGrantIds: [],
};

describe("character image accessibility and compact cards", () => {
  it("uses a real remote image, lazy loading, a reserved ratio, and a visible fallback on failure", () => {
    const { container } = render(<CharacterArt character={character} asset={{ publicUrl: "https://cdn.example.org/look.webp", altText: "Demo in a winter coat" }} />);
    const image = screen.getByRole("img", { name: "Demo in a winter coat" });
    expect(image.tagName).toBe("IMG");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("width", "800");
    expect(container.firstChild).toHaveClass("aspect-[4/5]");
    fireEvent.error(image);
    expect(screen.getByRole("img", { name: "Demo: Image temporarily unavailable" })).toBeInTheDocument();
    expect(screen.getByText("Signal series")).toBeVisible();
  });
  it("loads the hero eagerly and retries when the source changes", () => {
    const { rerender } = render(<CharacterArt character={character} priority asset={{ publicUrl: "https://cdn.example.org/one.webp", altText: "First" }} />);
    const image = screen.getByRole("img", { name: "First" });
    expect(image).toHaveAttribute("fetchpriority", "high");
    expect(image).toHaveAttribute("loading", "eager");
    fireEvent.error(image);
    rerender(<CharacterArt character={character} priority asset={{ publicUrl: "https://cdn.example.org/two.webp", altText: "Second" }} />);
    expect(screen.getByRole("img", { name: "Second" })).toHaveAttribute("src", "https://cdn.example.org/two.webp");
  });
  it("handles broken local art and does not render unsafe or metadata-only defaults", () => {
    const { rerender, container } = render(<CharacterArt character={{ ...character, slug: "akari-hoshino", rightsType: "ORIGINAL", metadataOnly: false }} locale="zh-Hant" />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByText("圖片暫時無法載入")).toBeVisible();
    rerender(<CharacterArt character={character} asset={{ publicUrl: "javascript:alert(1)", altText: "Unsafe" }} />);
    expect(container.querySelector("img")).toBeNull();
    rerender(<CharacterArt character={{ ...character, slug: "akari-hoshino", rightsType: "ORIGINAL", metadataOnly: true }} />);
    expect(container.querySelector("img")).toBeNull();
  });
  it("keeps cards scannable, labels support units, and retains unverified source status after image failure", () => {
    render(<CharacterCard character={character} asset={{ publicUrl: "https://cdn.example.org/look.webp", altText: "Look", sourceKind: "OFFICIAL_REFERENCE", permissionStatus: "UNVERIFIED" }} />);
    expect(screen.getByRole("heading", { name: "Demo" })).toBeInTheDocument();
    expect(screen.getByText("Signal series")).toBeVisible();
    expect(screen.getByText("Support-unit price")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Demo" })[0]).toHaveClass("w-full");
    expect(screen.getByText("Virtual support units, not probability")).toBeVisible();
    fireEvent.error(screen.getByRole("img", { name: "Look" }));
    expect(screen.getByText("Permission unverified")).toBeVisible();
    expect(screen.queryByText(character.summary)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Real support quote history")).not.toBeInTheDocument();
  });
});
