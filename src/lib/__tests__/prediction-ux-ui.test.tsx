import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PredictionTradeTicket } from "@/components/prediction-trade-ticket";
import { PredictionProbabilityChart, probabilityChartPoints } from "@/components/prediction-probability-chart";
import { predictionProposalLabel, predictionState } from "@/components/prediction-market-state";
import { isDefinitiveTradeDecline, isPredictionQuote, quoteBlockReasons, type PredictionQuote, type TradeReceipt } from "@/components/prediction-trade-model";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
const fetchMock = vi.fn();
const ok = (payload: unknown) => ({ ok: true, status: 200, json: async () => payload });
const fail = (status: number, code: string) => ({ ok: false, status, json: async () => ({ error: code, code }) });
const props = { marketSlug: "next-season", signedIn: true, tradingOpen: true, outcomes: [{ key: "YES" as const, probabilityBps: 5000 }, { key: "NO" as const, probabilityBps: 5000 }], myPositions: [], locale: "en" as const, balance: 300 };
const quote = (overrides: Partial<PredictionQuote> = {}): PredictionQuote => ({
  outcome: "YES", side: "BUY", quantity: 1, quoteToken: "signed-preview", expiresAt: new Date(Date.now() + 30_000).toISOString(),
  probabilityBeforeBps: 5000, probabilityAfterBps: 5200, grossAmount: 51, feeAmount: 2, netAmount: 53,
  affordable: true, positionShares: 0, totalMarketPositionShares: 0, limits: { maxPositionShares: 5, dailyGrossBuyRemaining: 200 }, ...overrides,
});
const receipt = (overrides: Partial<TradeReceipt["trade"]> = {}): TradeReceipt => ({ trade: { id: "trade-1", outcome: "YES", side: "BUY", quantity: 1, grossAmount: 51, feeAmount: 2, netAmount: 53, probabilityAfterBps: 5200, ...overrides }, wallet: { softBalance: 247 }, position: { shares: 1 } });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }
async function getPreview() {
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview trade" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Preview trade" }));
  return screen.findByRole("button", { name: "Confirm buy" });
}
let mobile = false;
let listeners: Set<() => void>;
beforeEach(() => {
  mobile = false; listeners = new Set(); sessionStorage.clear();
  fetchMock.mockReset(); mocks.refresh.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("matchMedia", () => ({ matches: mobile, addEventListener: (_: string, fn: () => void) => listeners.add(fn), removeEventListener: (_: string, fn: () => void) => listeners.delete(fn) }));
  vi.stubGlobal("PointerEvent", MouseEvent);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("prediction confirmation and receipts", () => {
  it("preselects the linked outcome without fetching or submitting", () => {
    render(<PredictionTradeTicket {...props} initialOutcome="NO" />);
    expect(screen.getByRole("button", { name: /NO 50.0%/ })).toHaveAttribute("aria-pressed", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["signed affordability", { affordable: false }, 300, /signed quote is not executable/],
    ["balance", { affordable: false }, 52, /balance cannot cover/],
    ["combined position cap", { affordable: false, totalMarketPositionShares: 5 }, 300, /YES and NO combined/],
    ["daily gross allowance", { affordable: false, limits: { maxPositionShares: 5, dailyGrossBuyRemaining: 50 } }, 300, /daily gross buy allowance/],
  ] as const)("blocks confirmation for %s", async (_, overrides, balance, reason) => {
    fetchMock.mockResolvedValueOnce(ok(quote(overrides)));
    render(<PredictionTradeTicket {...props} balance={balance} />);
    expect(await getPreview()).toBeDisabled();
    expect(screen.getByText(reason)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm buy" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/fees excluded; resets daily/)).toBeInTheDocument();
  });

  it("uses exact gross, fee and net for a sell, with no fee added twice", async () => {
    const q = quote({ side: "SELL", positionShares: 2, grossAmount: 50, feeAmount: 1, netAmount: 49 });
    fetchMock.mockResolvedValueOnce(ok(q)).mockResolvedValueOnce(ok(receipt({ side: "SELL", grossAmount: 50, feeAmount: 1, netAmount: 49 })));
    render(<PredictionTradeTicket {...props} myPositions={[{ outcome: "YES", shares: 2 }]} payoutPerShare={120} />);
    fireEvent.click(screen.getByRole("button", { name: "Sell" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview trade" }));
    const confirm = await screen.findByRole("button", { name: "Confirm sell" });
    expect(screen.getByText("Net proceeds").nextElementSibling).toHaveTextContent("49 SUP");
    expect(screen.getByText("Minus: fee").nextElementSibling).toHaveTextContent("1 SUP");
    expect(screen.getByText(/winning settlement value of 120 SUP/)).toBeInTheDocument();
    fireEvent.click(confirm);
    const result = await screen.findByRole("status");
    expect(result).toHaveTextContent("Net proceeds (after fee): 49 SUP");
    expect(result).toHaveTextContent("Fee: 1 SUP");
  });

  it("keeps a closable receipt through time, new previews and route refresh, with local updates", async () => {
    fetchMock.mockResolvedValueOnce(ok(quote())).mockResolvedValueOnce(ok(receipt())).mockResolvedValueOnce(ok(quote({ quoteToken: "new-preview", positionShares: 1 })));
    const view = render(<PredictionTradeTicket {...props} />);
    fireEvent.click(await getPreview());
    const result = await screen.findByRole("status");
    expect(result).toHaveTextContent("Bought 1 YES");
    expect(result).toHaveTextContent("Total cost (including fee): 53 SUP");
    expect(result).toHaveTextContent("Updated holding: 1 YES");
    expect(screen.getByText("Shares · holding 1 YES")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /YES 52.0%/ })).toBeInTheDocument();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByRole("status")).toBeInTheDocument();
    vi.useRealTimers();
    view.rerender(<PredictionTradeTicket {...props} balance={247} />);
    await getPreview();
    expect(screen.getByRole("status")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss trade receipt" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("recovers a lost response with the identical key and body, even after expiry", async () => {
    const q = quote();
    fetchMock.mockResolvedValueOnce(ok(q)).mockRejectedValueOnce(new TypeError("Response lost after commit")).mockResolvedValueOnce(ok(receipt()));
    render(<PredictionTradeTicket {...props} />);
    fireEvent.click(await getPreview());
    expect(await screen.findByRole("alert")).toHaveTextContent("Result unknown");
    expect(screen.getByRole("button", { name: /NO 50.0%/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Get a fresh quote" })).not.toBeInTheDocument();
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(q.expiresAt) + 60_000);
    fireEvent.click(screen.getByRole("button", { name: "Recover same trade result" }));
    await screen.findByRole("status");
    const first = fetchMock.mock.calls[1][1];
    const retry = fetchMock.mock.calls[2][1];
    expect(first.headers["idempotency-key"]).toBeTruthy();
    expect(retry.headers["idempotency-key"]).toBe(first.headers["idempotency-key"]);
    expect(retry.body).toBe(first.body);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("keeps the original key across lost response and expired authentication, then starts the next trade with a new key", async () => {
    fetchMock.mockResolvedValueOnce(ok(quote())).mockRejectedValueOnce(new Error("lost response"))
      .mockResolvedValueOnce(fail(401, "UNAUTHENTICATED")).mockResolvedValueOnce(ok(receipt()))
      .mockResolvedValueOnce(ok(quote({ quoteToken: "second-trade", positionShares: 1, totalMarketPositionShares: 1 })))
      .mockResolvedValueOnce(ok(receipt({ id: "trade-2" })));
    render(<PredictionTradeTicket {...props} />);
    fireEvent.click(await getPreview());
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Recover same trade result" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Recover same trade result" })).toBeEnabled());
    expect(screen.getByRole("button", { name: "Sell" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Recover same trade result" }));
    await screen.findByRole("status");
    fireEvent.click(await getPreview());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    const keys = [1, 2, 3, 5].map((index) => fetchMock.mock.calls[index][1].headers["idempotency-key"]);
    expect(keys[0]).toBe(keys[1]); expect(keys[0]).toBe(keys[2]); expect(keys[0]).not.toBe(keys[3]);
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[3][1].body);
  });

  it("reconciles immediate local updates with refreshed server data without dismissing the receipt", async () => {
    fetchMock.mockResolvedValueOnce(ok(quote())).mockResolvedValueOnce(ok(receipt({ marketVersion: 2 })));
    const view = render(<PredictionTradeTicket {...props} marketVersion={1} />);
    fireEvent.click(await getPreview());
    await screen.findByRole("status");
    expect(screen.getByText("Shares · holding 1 YES")).toBeInTheDocument();
    view.rerender(<PredictionTradeTicket {...props} marketVersion={3} balance={400} myPositions={[{ outcome: "YES", shares: 2 }]} outcomes={[{ key: "YES", probabilityBps: 5400 }, { key: "NO", probabilityBps: 4600 }]} />);
    expect(screen.getByText("Shares · holding 2 YES")).toBeInTheDocument();
    expect(screen.getByText("400 SUP")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "YES 54.0%" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it.each([[500, "INTERNAL_ERROR"], [408, "TIMEOUT"], [401, "UNAUTHENTICATED"], [409, "ACTION_IN_PROGRESS"], [409, "IDEMPOTENCY_CONFLICT"]])("keeps an uncertain %s / %s locked", async (status, code) => {
    fetchMock.mockResolvedValueOnce(ok(quote())).mockResolvedValueOnce(fail(status as number, code as string));
    render(<PredictionTradeTicket {...props} />);
    fireEvent.click(await getPreview());
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Sell" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Recover same trade result" })).toBeEnabled();
  });

  it("treats malformed success receipts as unknown instead of allowing another order", async () => {
    fetchMock.mockResolvedValueOnce(ok(quote())).mockResolvedValueOnce(ok({ success: true }));
    render(<PredictionTradeTicket {...props} />);
    fireEvent.click(await getPreview());
    await screen.findByRole("alert");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 shares" })).toBeDisabled();
  });

  it("allows a new preview after a definitive stale decline, and uses a new intent key", async () => {
    fetchMock.mockResolvedValueOnce(ok(quote())).mockResolvedValueOnce(fail(409, "QUOTE_CHANGED"))
      .mockResolvedValueOnce(ok(quote({ quoteToken: "fresh" }))).mockResolvedValueOnce(ok(receipt()));
    render(<PredictionTradeTicket {...props} />);
    fireEvent.click(await getPreview());
    await screen.findByText("QUOTE_CHANGED");
    fireEvent.click(await getPreview());
    await screen.findByRole("status");
    expect(fetchMock.mock.calls[1][1].headers["idempotency-key"]).not.toBe(fetchMock.mock.calls[3][1].headers["idempotency-key"]);
  });

  it("prevents double confirmation while the first POST is in flight", async () => {
    const delayed = deferred<ReturnType<typeof ok>>();
    fetchMock.mockResolvedValueOnce(ok(quote())).mockReturnValueOnce(delayed.promise);
    render(<PredictionTradeTicket {...props} />);
    const confirm = await getPreview();
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "3 shares" })).toBeDisabled();
    await act(async () => delayed.resolve(ok(receipt())));
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("restores account-scoped pending intent after remount, ignoring a different initial outcome", async () => {
    fetchMock.mockResolvedValueOnce(ok(quote())).mockRejectedValueOnce(new Error("lost"));
    const view = render(<PredictionTradeTicket {...props} userId="reader-1" />);
    fireEvent.click(await getPreview());
    await screen.findByRole("alert");
    const first = fetchMock.mock.calls[1][1];
    view.unmount();
    fetchMock.mockResolvedValueOnce(ok(receipt()));
    render(<PredictionTradeTicket {...props} userId="reader-1" initialOutcome="NO" tradingOpen={false} />);
    const retry = await screen.findByRole("button", { name: "Recover same trade result" });
    fireEvent.click(retry);
    await screen.findByRole("status");
    expect(fetchMock.mock.calls[2][1].body).toBe(first.body);
    expect(fetchMock.mock.calls[2][1].headers["idempotency-key"]).toBe(first.headers["idempotency-key"]);
    expect(sessionStorage.length).toBe(0);
  });

  it("does not restore another user's intent", async () => {
    sessionStorage.setItem("prediction-intent:v1:reader-1:next-season", JSON.stringify({ key: "pending-key", quote: quote() }));
    render(<PredictionTradeTicket {...props} userId="reader-2" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Preview trade" })).toBeEnabled());
    expect(screen.queryByRole("button", { name: "Recover same trade result" })).not.toBeInTheDocument();
  });

  it("does not submit if durable recovery storage cannot be written", async () => {
    fetchMock.mockResolvedValueOnce(ok(quote()));
    render(<PredictionTradeTicket {...props} userId="reader" />);
    const confirm = await getPreview();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    fireEvent.click(confirm);
    expect(await screen.findByRole("alert")).toHaveTextContent("No trade was sent");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("requires previewing again after client-side expiry", async () => {
    const q = quote();
    fetchMock.mockResolvedValueOnce(ok(q));
    render(<PredictionTradeTicket {...props} />);
    const confirm = await getPreview();
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(q.expiresAt) + 1);
    fireEvent.click(confirm);
    expect(screen.getByRole("button", { name: "Refresh quote" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ignores a superseded preview even when the network ignores abort", async () => {
    const old = deferred<ReturnType<typeof ok>>();
    const next = quote({ outcome: "NO", quoteToken: "no-preview" });
    fetchMock.mockReturnValueOnce(old.promise).mockResolvedValueOnce(ok(next));
    render(<PredictionTradeTicket {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview trade" }));
    fireEvent.click(screen.getByRole("button", { name: /NO 50.0%/ }));
    await getPreview();
    await act(async () => old.resolve(ok(quote())));
    expect(screen.getByText("1 NO · Buy preview")).toBeInTheDocument();
    expect(screen.queryByText("1 YES · Buy preview")).not.toBeInTheDocument();
  });

  it("rejects a preview for the wrong quantity or side", async () => {
    fetchMock.mockResolvedValueOnce(ok(quote({ quantity: 2 })));
    render(<PredictionTradeTicket {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview trade" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("does not match your selection");
    expect(screen.queryByRole("button", { name: "Confirm buy" })).not.toBeInTheDocument();
  });

  it("keeps the same state in the mobile accessible drawer and restores trigger focus", async () => {
    mobile = true;
    fetchMock.mockResolvedValueOnce(ok(quote())).mockRejectedValueOnce(new Error("lost"));
    render(<PredictionTradeTicket {...props} />);
    const trigger = screen.getByRole("button", { name: "Open prediction trade" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Prediction trade" })).toBeInTheDocument();
    fireEvent.click(await getPreview());
    await screen.findByRole("alert");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Check trade result" }));
    expect(screen.getByRole("button", { name: "Recover same trade result" })).toBeInTheDocument();
    act(() => { mobile = false; listeners.forEach((fn) => fn()); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recover same trade result" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("provides localized signed-out and closed states without submitting", () => {
    const view = render(<PredictionTradeTicket {...props} signedIn={false} locale="zh-Hant" />);
    expect(screen.getByRole("link", { name: "登入後參與" })).toBeInTheDocument();
    view.rerender(<PredictionTradeTicket {...props} tradingOpen={false} locale="zh-Hant" />);
    expect(screen.getByText(/交易已停止/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

const chartProps = { range: "24h" as const, baseHref: "/en/predictions/next-season?outcome=NO", locale: "en" as const };
const buckets = [
  { timestamp: "2026-11-03T16:00:00.000Z", yesProbabilityBps: 2000, grossVolume: 0, tradeCount: 0 },
  { timestamp: "2026-11-03T17:00:00.000Z", yesProbabilityBps: 4000, grossVolume: 20, tradeCount: 1 },
  { timestamp: "2026-11-03T20:00:00.000Z", yesProbabilityBps: 6000, grossVolume: 40, tradeCount: 2 },
];
describe("prediction chart and state labels", () => {
  it("shows an honest empty state and full default scale", () => {
    render(<PredictionProbabilityChart {...chartProps} buckets={[]} />);
    expect(screen.getByText("No trade history yet")).toBeInTheDocument();
    expect(screen.getByText("0% – 100%")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });
  it("does not invent a line for a single point or activity in empty buckets", () => {
    render(<PredictionProbabilityChart {...chartProps} buckets={[buckets[0]]} />);
    expect(screen.queryByTestId("probability-line")).not.toBeInTheDocument();
    expect(screen.getByText(/One data point only/)).toBeInTheDocument();
    expect(screen.getByTestId("activity-bar")).toHaveAttribute("height", "0");
    expect(screen.getByText(/No trades in this range/)).toBeInTheDocument();
  });
  it("spaces sparse points by real time and uses fixed probability and real histogram values", () => {
    const points = probabilityChartPoints(buckets, "24h");
    expect(points.map((p) => p.x)).toEqual([0, 200, 800]);
    expect(points.map((p) => p.y)).toEqual([160, 120, 80]);
    render(<PredictionProbabilityChart {...chartProps} buckets={buckets} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getAllByTestId("activity-bar").map((bar) => bar.getAttribute("height"))).toEqual(["0", "28", "56"]);
    expect(screen.getByRole("link", { name: "7d" })).toHaveAttribute("href", "/en/predictions/next-season?outcome=NO&range=7d");
  });
  it.each(["24h", "7d", "30d"] as const)("provides time, probability and volume by keyboard for %s", (range) => {
    render(<PredictionProbabilityChart {...chartProps} range={range} buckets={buckets} />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider).toHaveAttribute("aria-valuetext", expect.stringContaining("00:00 HKT · YES 20.0% · Volume 0 SUP"));
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuenow", "2");
    expect(slider).toHaveAttribute("aria-valuetext", expect.stringContaining("01:00 HKT · YES 40.0% · Volume 20 SUP"));
    fireEvent.keyDown(slider, { key: "End" });
    expect(slider).toHaveAttribute("aria-valuetext", expect.stringContaining("04:00 HKT · YES 60.0% · Volume 40 SUP"));
    expect(screen.getByText("Total volume in this range: 60 SUP")).toBeInTheDocument();
  });
  it("supports hover and touch point inspection", () => {
    render(<PredictionProbabilityChart {...chartProps} buckets={buckets} />);
    const slider = screen.getByRole("slider");
    vi.spyOn(slider, "getBoundingClientRect").mockReturnValue({ left: 10, width: 500 } as DOMRect);
    fireEvent.pointerMove(slider, { clientX: 110 });
    expect(slider).toHaveAttribute("aria-valuenow", "2");
    fireEvent.pointerDown(slider, { clientX: 10, pointerType: "touch" });
    expect(slider).toHaveAttribute("aria-valuenow", "1");
  });
  it.each(["DRAFT", "OPEN", "LOCKED", "PROPOSED", "CHALLENGE", "RESOLVED", "VOID", "UNKNOWN"])("localizes %s without treating unknown status as open", (status) => {
    const en = predictionState(status, "en");
    const zh = predictionState(status, "zh-Hant");
    expect(en.label).not.toBe(status);
    expect(zh.label).not.toBe(en.label);
    expect(zh.next).toBeTruthy();
    if (status === "UNKNOWN") expect(en.label).toBe("Status unavailable");
  });
  it("localizes proposal review states", () => {
    expect(predictionProposalLabel("CHALLENGED", "zh-Hant")).toBe("異議審核中");
    expect(predictionProposalLabel("CONFIRMED", "en")).toBe("Confirmed");
  });
  it("validates signed preview arithmetic and caps independently of affordability", () => {
    expect(isPredictionQuote(quote({ netAmount: 51 }))).toBe(false);
    expect(quoteBlockReasons(quote({ affordable: true, totalMarketPositionShares: 5 }), 10, 0, "en")).toHaveLength(2);
    expect(isDefinitiveTradeDecline(409, "ACTION_IN_PROGRESS")).toBe(false);
    expect(isDefinitiveTradeDecline(409, "QUOTE_EXPIRED")).toBe(true);
  });
});
