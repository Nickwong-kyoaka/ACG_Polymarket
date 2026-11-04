export type OutcomeKey = "YES" | "NO";
export type TradeSide = "BUY" | "SELL";
export type PredictionLocale = "en" | "zh-Hant";
export interface TradeDraft { outcome: OutcomeKey; side: TradeSide; quantity: number }
export interface PredictionQuote extends TradeDraft {
  quoteToken: string;
  expiresAt: string;
  probabilityBeforeBps: number;
  probabilityAfterBps: number;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  affordable: boolean;
  positionShares: number;
  totalMarketPositionShares?: number;
  limits: { maxPositionShares: number; dailyGrossBuyRemaining: number; dailyGrossBuyLimit?: number };
}
export interface TradeReceipt {
  trade: TradeDraft & { id?: string; marketVersion?: number; grossAmount: number; feeAmount: number; netAmount: number; probabilityAfterBps: number };
  wallet: { softBalance: number };
  position: { shares: number };
}
export interface ConfirmedIntent { key: string; quote: PredictionQuote }
export function matchesDraft(quote: TradeDraft, draft: TradeDraft) {
  return quote.outcome === draft.outcome && quote.side === draft.side && quote.quantity === draft.quantity;
}
const nonnegative = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
export function isPredictionQuote(value: unknown): value is PredictionQuote {
  const q = value as PredictionQuote | null;
  return Boolean(q && ["YES", "NO"].includes(q.outcome) && ["BUY", "SELL"].includes(q.side)
    && nonnegative(q.quantity) && q.quantity >= 1 && q.quantity <= 3
    && typeof q.quoteToken === "string" && q.quoteToken.length > 0 && Number.isFinite(Date.parse(q.expiresAt))
    && [q.grossAmount, q.feeAmount, q.netAmount, q.positionShares, q.probabilityBeforeBps, q.probabilityAfterBps,
      q.limits?.maxPositionShares, q.limits?.dailyGrossBuyRemaining].every(nonnegative)
    && q.probabilityBeforeBps <= 10_000 && q.probabilityAfterBps <= 10_000
    && typeof q.affordable === "boolean"
    && q.netAmount === (q.side === "BUY" ? q.grossAmount + q.feeAmount : q.grossAmount - q.feeAmount));
}
export function isTradeReceipt(value: unknown, draft: TradeDraft): value is TradeReceipt {
  const r = value as TradeReceipt | null;
  return Boolean(r?.trade && matchesDraft(r.trade, draft)
    && [r.trade.netAmount, r.trade.grossAmount, r.trade.feeAmount, r.trade.probabilityAfterBps,
      r.wallet?.softBalance, r.position?.shares].every(nonnegative)
    && r.trade.probabilityAfterBps <= 10_000
    && r.trade.netAmount === (draft.side === "BUY" ? r.trade.grossAmount + r.trade.feeAmount : r.trade.grossAmount - r.trade.feeAmount));
}
export function quoteBlockReasons(quote: PredictionQuote, balance: number | undefined, totalHeld: number, locale: PredictionLocale) {
  const zh = locale === "zh-Hant";
  const reasons: string[] = [];
  if (quote.side === "BUY") {
    if (balance !== undefined && quote.netAmount > balance) reasons.push(zh ? "SUP 餘額不足以支付含費用的總支出。" : "Your SUP balance cannot cover the total cost including the fee.");
    if ((quote.totalMarketPositionShares ?? totalHeld) + quote.quantity > quote.limits.maxPositionShares) reasons.push(zh ? "這筆交易會超出本題的持倉上限（YES 與 NO 合計）。" : "This trade exceeds the market position cap (YES and NO combined).");
    if (quote.grossAmount > quote.limits.dailyGrossBuyRemaining) reasons.push(zh ? "這筆交易會超出今日買入額度；額度不含費用。" : "This trade exceeds your remaining daily gross buy allowance, excluding fees.");
  } else if (quote.quantity > quote.positionShares) reasons.push(zh ? "持有份數不足以賣回。" : "You do not hold enough shares to sell.");
  if (!quote.affordable && !reasons.length) reasons.push(zh ? "此簽名報價目前不可執行；請更新報價以檢查餘額及限額。" : "This signed quote is not executable. Refresh it to check your balance and limits.");
  return reasons;
}
// These declines occur after the server's idempotency lookup, ruling out a committed trade.
export function isDefinitiveTradeDecline(status: number, code: unknown) {
  return status >= 400 && status < 500 && typeof code === "string" && [
    "QUOTE_EXPIRED", "QUOTE_CHANGED", "QUOTE_MISMATCH", "INVALID_QUOTE", "MARKET_CLOSED",
    "INSUFFICIENT_BALANCE", "POSITION_LIMIT", "DAILY_BUY_LIMIT", "INSUFFICIENT_POSITION", "SELL_BELOW_FEE",
  ].includes(code);
}
