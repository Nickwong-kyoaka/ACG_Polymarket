import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Character, CharacterAsset, CharacterView } from "@/lib/types";

const mocks = vi.hoisted(() => ({ view: vi.fn(), portfolio: vi.fn(), reactions: vi.fn(), watchlist: vi.fn() }));
vi.mock("@/lib/store", () => ({ getCharacterView: mocks.view, getPortfolioView: mocks.portfolio, getReactionSummary: mocks.reactions, getWatchlistIds: mocks.watchlist }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/follow-button", () => ({ FollowButton: () => <button>Follow character</button> }));
vi.mock("@/components/watchlist-button", () => ({ WatchlistButton: () => <button>Watch character</button> }));
vi.mock("@/components/support-trade-panel", () => ({ SupportTradePanel: () => <div>Existing trade form</div> }));
vi.mock("@/components/market-history-chart", () => ({ MarketHistoryChart: () => <div>Existing support history</div> }));
vi.mock("@/components/market-alert-panel", () => ({ MarketAlertPanel: () => <div>Existing alerts</div> }));
vi.mock("@/components/comment-panel", () => ({ CommentPanel: () => <div>Existing comments and reactions</div> }));
vi.mock("@/components/entity-proposal-form", () => ({ EntityProposalForm: ({ fields }: { fields: Array<{ key: string }> }) => <div>Proposal fields: {fields.map((field) => field.key).join(", ")}</div> }));
import CharacterPage from "@/app/[locale]/character/[slug]/page";

const character: Character = { id: "demo", seriesId: "series", slug: "demo", name: "Demo", title: "Kind signal", summary: "One concise biography only.", fandomPrompt: "A reason to stay", mood: "Calm", sourceTitle: "Signal series", rightsType: "LICENSED", metadataOnly: true, basePrice: 12, priceStep: 1, unitsPerStep: 10, circulatingUnits: 2, supporterCount: 3, isFeatured: true, tags: ["calm"], accentFrom: "#fff", accentTo: "#ddd", relatedCharacterIds: [], attributeValues: [], assetIds: [], rightsGrantIds: [] };
const asset = (id: string, priority: number, extra: Partial<CharacterAsset> = {}): CharacterAsset => ({ id, kind: "HERO", label: id, altText: `${id} visual`, storageKey: `assets/${id}.webp`, publicUrl: `https://cdn.example.org/${id}.webp`, version: 1, workflowStatus: "PUBLISHED", contentRating: "SFW", sourceKind: "OFFICIAL_REFERENCE", sourceUrl: "https://example.org/visual", permissionStatus: "UNVERIFIED", primaryPriority: priority, ...extra });
const view: CharacterView = {
  character, series: { id: "series", slug: "signal", title: "Signal series", summary: "A series", rightsType: "LICENSED", metadataOnly: true },
  assets: [asset("second", 1), asset("primary", 5), asset("revoked", 99, { permissionStatus: "TAKEDOWN_REQUESTED" }), asset("unsafe", 999, { contentRating: "NSFW" })], rightsGrants: [], quote: 12, sellQuote: 10,
  attributes: [{ id: "a", key: "mood", label: "Company style", value: "Quiet company", valueType: "text", displayable: true, filterable: false, sortable: false, sensitive: false, spoiler: false, displayOrder: 1 }],
  relatedCharacters: [{ ...character, id: "related", slug: "related", name: "Related friend" }], comments: [], reactions: [],
  sourceAttribution: { id: "source", characterId: "demo", sourceKind: "MANUAL", sourceLabel: "Reference record", sourceUrl: "https://example.org/canonical", licenseName: "Metadata", attributionText: "Editorial summary", importedAt: "2026-01-01" },
};

beforeEach(() => {
  window.history.replaceState(null, "", "/en/character/demo");
  mocks.view.mockResolvedValue(view); mocks.portfolio.mockResolvedValue(null); mocks.reactions.mockResolvedValue({}); mocks.watchlist.mockResolvedValue([]);
});
afterEach(cleanup);

describe("character detail audit", () => {
  it("shows the biography once, prioritizes existing safe art, and keeps follow/support and related attributes", async () => {
    const { container } = render(await CharacterPage({ params: Promise.resolve({ locale: "en", slug: "demo" }) }));
    expect(screen.getAllByText(character.summary)).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Follow character" })).toBeVisible();
    expect(container.querySelector('[aria-haspopup="dialog"]')).toBeVisible();
    expect(screen.getByRole("img", { name: "primary visual" })).toHaveAttribute("loading", "eager");
    expect(screen.queryByRole("img", { name: "revoked visual" })).not.toBeInTheDocument();
    expect(screen.getByText("Quiet company")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Related friend" })).toBeVisible();
    expect(screen.queryByText("Existing support history")).not.toBeInTheDocument();
    fireEvent.click(container.querySelector('[aria-haspopup="dialog"]')!);
    expect(screen.getByRole("dialog")).toHaveTextContent("Existing trade form");
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close support panel" }));
    expect(container.querySelector('[aria-haspopup="dialog"]')).toHaveFocus();
  });
  it("preserves comments, proposals, all visual variants, history, alerts, comfort and canonical sources", async () => {
    render(await CharacterPage({ params: Promise.resolve({ locale: "en", slug: "demo" }) }));
    await userEvent.click(screen.getByRole("tab", { name: "Notes" }));
    expect(screen.getByText("Existing comments and reactions")).toBeVisible();
    expect(screen.getByText(/Proposal fields:/)).toHaveTextContent("summary, name, title, mood, fandomPrompt, favoritePhrase, releaseSeason");
    await userEvent.click(screen.getByRole("tab", { name: "Gallery" }));
    const gallery = screen.getByRole("tabpanel", { name: "Gallery" });
    expect(within(gallery).getAllByRole("img")).toHaveLength(2);
    expect(within(gallery).getAllByText("Permission unverified")).toHaveLength(2);
    await userEvent.click(screen.getByRole("tab", { name: "Support" }));
    expect(screen.getByText("Existing support history")).toBeVisible();
    expect(screen.getByText("Existing alerts")).toBeVisible();
    await userEvent.click(screen.getByRole("tab", { name: "Comfort" }));
    expect(screen.getByRole("heading", { name: "Browser speech demo" })).toBeVisible();
    await userEvent.click(screen.getByText("Sources, permissions & credits"));
    expect(screen.getByRole("link", { name: "Canonical character source (new tab)" })).toHaveAttribute("href", "https://example.org/canonical");
  });
  it("accepts a requested initial tab and retains localized source/voice labeling", async () => {
    window.history.replaceState(null, "", "/zh-Hant/character/demo?tab=comfort");
    render(await CharacterPage({ params: Promise.resolve({ locale: "zh-Hant", slug: "demo" }), searchParams: Promise.resolve({ tab: "comfort" }) }));
    expect(screen.getByRole("tab", { name: "陪伴" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "瀏覽器合成語音示範" })).toBeVisible();
    expect(within(screen.getByRole("region", { name: "Demo" })).getByText("授權未驗證", { selector: "strong" })).toBeVisible();
    expect(screen.queryByText("今晚，讓角色親自留一句話給你")).not.toBeInTheDocument();
  });
});
