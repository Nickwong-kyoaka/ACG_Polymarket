import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError, AuthenticationError, AuthorizationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { classifyRetryablePrismaConflict, waitForSerializableRetry } from "@/lib/prisma-retry";

export const PREDICTION_QUOTE_TTL_MS = 30_000;
export const PREDICTION_PAYOUT_PER_SHARE = 100;
export const PREDICTION_LIQUIDITY_PARAMETER = 20;
export const PREDICTION_FEE_RATE = 0.02;
export const PREDICTION_MIN_FEE = 1;
export const PREDICTION_MAX_ORDER_SHARES = 3;
export const PREDICTION_MAX_POSITION_SHARES = 5;
export const PREDICTION_DAILY_GROSS_BUY_LIMIT = 200;
export const PREDICTION_CHALLENGE_WINDOW_MS = 24 * 60 * 60 * 1_000;

export type PredictionLocale = "en" | "zh-Hant";
export type PredictionSide = "BUY" | "SELL";
export type PredictionOutcomeKey = "YES" | "NO";
export type PredictionHistoryRange = "24h" | "7d" | "30d";

type Tx = Prisma.TransactionClient;
type Db = typeof prisma | Tx;

const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 30_000,
};

const signedQuotePayloadSchema = z.object({
  version: z.literal(1),
  userId: z.string().min(1),
  marketId: z.string().min(1),
  outcomeId: z.string().min(1),
  outcomeKey: z.enum(["YES", "NO"]),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().int().min(1).max(PREDICTION_MAX_ORDER_SHARES),
  marketVersion: z.number().int().nonnegative(),
  yesSharesBefore: z.number().int().nonnegative(),
  noSharesBefore: z.number().int().nonnegative(),
  yesSharesAfter: z.number().int().nonnegative(),
  noSharesAfter: z.number().int().nonnegative(),
  grossAmount: z.number().int().nonnegative(),
  feeAmount: z.number().int().nonnegative(),
  netAmount: z.number().int().nonnegative(),
  probabilityBeforeBps: z.number().int().min(0).max(10_000),
  probabilityAfterBps: z.number().int().min(0).max(10_000),
  issuedAt: z.number().int(),
  expiresAt: z.number().int(),
});

type SignedPredictionQuotePayload = z.infer<typeof signedQuotePayloadSchema>;

export interface PredictionQuoteResponse {
  quoteToken: string;
  expiresAt: string;
  marketId: string;
  outcomeId: string;
  outcome: PredictionOutcomeKey;
  side: PredictionSide;
  quantity: number;
  currency: "SUP";
  marketVersion: number;
  probabilityBeforeBps: number;
  probabilityAfterBps: number;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  yesSharesBefore: number;
  noSharesBefore: number;
  yesSharesAfter: number;
  noSharesAfter: number;
  affordable: boolean;
  positionShares: number;
  totalMarketPositionShares: number;
  limits: {
    maxOrderShares: number;
    maxPositionShares: number;
    dailyGrossBuyLimit: number;
    dailyGrossBuySpent: number;
    dailyGrossBuyRemaining: number;
  };
}

interface PredictionMarketState {
  id: string;
  marketVersion: number;
  yesShares: number;
  noShares: number;
  liquidityParameter: number;
  payoutPerShare: number;
}

interface PredictionQuoteCalculation {
  outcome: PredictionOutcomeKey;
  side: PredictionSide;
  quantity: number;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  probabilityBeforeBps: number;
  probabilityAfterBps: number;
  yesSharesBefore: number;
  noSharesBefore: number;
  yesSharesAfter: number;
  noSharesAfter: number;
}

interface MarketLocaleRow {
  locale: "EN" | "ZH_HANT";
  question: string;
  description: string;
  edgeCaseRules: string;
}

interface OutcomeRow {
  id: string;
  key: string;
  label: string;
  sharesOutstanding: number;
}

interface PublicMarketRecord extends PredictionMarketState {
  slug: string;
  question: string;
  description: string;
  status: string;
  resolutionSourceUrl: string;
  resolutionSourceLabel: string;
  timezone: string;
  edgeCaseRules: string;
  closesAt: Date;
  challengeEndsAt: Date | null;
  resolvedAt: Date | null;
  winningOutcomeId: string | null;
  reservedLiability: number;
  participantCount: number;
  createdAt: Date;
  updatedAt: Date;
  locales: MarketLocaleRow[];
  outcomes: OutcomeRow[];
  _count?: { trades: number };
}

function predictionQuoteSecret(override?: string) {
  const secret =
    override ??
    process.env.PREDICTION_QUOTE_SECRET ??
    process.env.MARKET_QUOTE_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new AppError(
      "Prediction quote signing is not configured.",
      500,
      "PREDICTION_QUOTE_CONFIG_ERROR",
    );
  }

  return secret ?? "local-prediction-quote-secret";
}

function signQuote(body: string, secret?: string) {
  return createHmac("sha256", predictionQuoteSecret(secret)).update(body).digest("base64url");
}

function encodeQuote(payload: SignedPredictionQuotePayload, secret?: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signQuote(body, secret)}`;
}

function decodeQuote(token: string, secret?: string) {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) {
    throw new AppError("The prediction quote token is invalid.", 422, "INVALID_QUOTE");
  }

  const expected = signQuote(body, secret);
  const valid =
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) {
    throw new AppError("The prediction quote token is invalid.", 422, "INVALID_QUOTE");
  }

  try {
    return signedQuotePayloadSchema.parse(
      JSON.parse(Buffer.from(body, "base64url").toString("utf8")),
    );
  } catch {
    throw new AppError("The prediction quote token is invalid.", 422, "INVALID_QUOTE");
  }
}

function stableLogSumExp(first: number, second: number) {
  const maximum = Math.max(first, second);
  return maximum + Math.log(Math.exp(first - maximum) + Math.exp(second - maximum));
}

export function calculateLmsrCost(
  yesShares: number,
  noShares: number,
  liquidityParameter = PREDICTION_LIQUIDITY_PARAMETER,
  payoutPerShare = PREDICTION_PAYOUT_PER_SHARE,
) {
  if (yesShares < 0 || noShares < 0) {
    throw new AppError("Prediction share supply cannot be negative.", 422, "INVALID_SUPPLY");
  }
  if (liquidityParameter <= 0 || payoutPerShare <= 0) {
    throw new AppError("Prediction market economics are invalid.", 500, "INVALID_MARKET");
  }

  return (
    liquidityParameter *
    payoutPerShare *
    stableLogSumExp(yesShares / liquidityParameter, noShares / liquidityParameter)
  );
}

export function calculateOutcomeProbabilityBps(
  yesShares: number,
  noShares: number,
  outcome: PredictionOutcomeKey,
  liquidityParameter = PREDICTION_LIQUIDITY_PARAMETER,
) {
  if (yesShares < 0 || noShares < 0 || liquidityParameter <= 0) {
    throw new AppError("Prediction market state is invalid.", 500, "INVALID_MARKET");
  }

  const difference =
    outcome === "YES"
      ? (noShares - yesShares) / liquidityParameter
      : (yesShares - noShares) / liquidityParameter;
  const probability =
    difference >= 0
      ? Math.exp(-difference) / (1 + Math.exp(-difference))
      : 1 / (1 + Math.exp(difference));
  return Math.max(0, Math.min(10_000, Math.round(probability * 10_000)));
}

export function calculatePredictionMarketReserve(
  liquidityParameter = PREDICTION_LIQUIDITY_PARAMETER,
  payoutPerShare = PREDICTION_PAYOUT_PER_SHARE,
) {
  if (liquidityParameter <= 0 || payoutPerShare <= 0) {
    throw new AppError("Prediction market economics are invalid.", 422, "INVALID_MARKET");
  }
  return Math.ceil(liquidityParameter * payoutPerShare * Math.log(2));
}

export function calculatePredictionQuote(input: {
  market: PredictionMarketState;
  outcome: PredictionOutcomeKey;
  side: PredictionSide;
  quantity: number;
}): PredictionQuoteCalculation {
  const { market, outcome, side, quantity } = input;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > PREDICTION_MAX_ORDER_SHARES) {
    throw new AppError(
      `Quantity must be between 1 and ${PREDICTION_MAX_ORDER_SHARES}.`,
      422,
      "INVALID_QUANTITY",
    );
  }

  const yesDelta = outcome === "YES" ? quantity : 0;
  const noDelta = outcome === "NO" ? quantity : 0;
  const direction = side === "BUY" ? 1 : -1;
  const yesSharesAfter = market.yesShares + yesDelta * direction;
  const noSharesAfter = market.noShares + noDelta * direction;
  if (yesSharesAfter < 0 || noSharesAfter < 0) {
    throw new AppError("Not enough outcome shares are available to sell.", 422, "INVALID_SUPPLY");
  }

  const costBefore = calculateLmsrCost(
    market.yesShares,
    market.noShares,
    market.liquidityParameter,
    market.payoutPerShare,
  );
  const costAfter = calculateLmsrCost(
    yesSharesAfter,
    noSharesAfter,
    market.liquidityParameter,
    market.payoutPerShare,
  );
  const rawGross = side === "BUY" ? costAfter - costBefore : costBefore - costAfter;
  const grossAmount =
    side === "BUY"
      ? Math.ceil(rawGross - Number.EPSILON)
      : Math.floor(rawGross + Number.EPSILON);
  const feeAmount = Math.max(PREDICTION_MIN_FEE, Math.ceil(grossAmount * PREDICTION_FEE_RATE));
  const netAmount =
    side === "BUY" ? grossAmount + feeAmount : Math.max(0, grossAmount - feeAmount);

  return {
    outcome,
    side,
    quantity,
    grossAmount,
    feeAmount,
    netAmount,
    probabilityBeforeBps: calculateOutcomeProbabilityBps(
      market.yesShares,
      market.noShares,
      outcome,
      market.liquidityParameter,
    ),
    probabilityAfterBps: calculateOutcomeProbabilityBps(
      yesSharesAfter,
      noSharesAfter,
      outcome,
      market.liquidityParameter,
    ),
    yesSharesBefore: market.yesShares,
    noSharesBefore: market.noShares,
    yesSharesAfter,
    noSharesAfter,
  };
}

export function createSignedPredictionQuote(input: {
  market: PredictionMarketState;
  outcomeId: string;
  outcome: PredictionOutcomeKey;
  side: PredictionSide;
  quantity: number;
  userId: string;
  walletBalance: number;
  positionShares: number;
  totalMarketPositionShares: number;
  dailyGrossBuySpent?: number;
  now?: Date;
  secret?: string;
}): PredictionQuoteResponse {
  const now = input.now ?? new Date();
  const quote = calculatePredictionQuote(input);
  const dailyGrossBuySpent = input.dailyGrossBuySpent ?? 0;
  const payload: SignedPredictionQuotePayload = {
    version: 1,
    userId: input.userId,
    marketId: input.market.id,
    outcomeId: input.outcomeId,
    outcomeKey: input.outcome,
    side: quote.side,
    quantity: quote.quantity,
    marketVersion: input.market.marketVersion,
    yesSharesBefore: quote.yesSharesBefore,
    noSharesBefore: quote.noSharesBefore,
    yesSharesAfter: quote.yesSharesAfter,
    noSharesAfter: quote.noSharesAfter,
    grossAmount: quote.grossAmount,
    feeAmount: quote.feeAmount,
    netAmount: quote.netAmount,
    probabilityBeforeBps: quote.probabilityBeforeBps,
    probabilityAfterBps: quote.probabilityAfterBps,
    issuedAt: now.getTime(),
    expiresAt: now.getTime() + PREDICTION_QUOTE_TTL_MS,
  };

  return {
    quoteToken: encodeQuote(payload, input.secret),
    expiresAt: new Date(payload.expiresAt).toISOString(),
    marketId: input.market.id,
    outcomeId: input.outcomeId,
    outcome: input.outcome,
    side: input.side,
    quantity: input.quantity,
    currency: "SUP",
    marketVersion: input.market.marketVersion,
    probabilityBeforeBps: quote.probabilityBeforeBps,
    probabilityAfterBps: quote.probabilityAfterBps,
    grossAmount: quote.grossAmount,
    feeAmount: quote.feeAmount,
    netAmount: quote.netAmount,
    yesSharesBefore: quote.yesSharesBefore,
    noSharesBefore: quote.noSharesBefore,
    yesSharesAfter: quote.yesSharesAfter,
    noSharesAfter: quote.noSharesAfter,
    affordable:
      input.side === "BUY"
        ? input.walletBalance >= quote.netAmount &&
          dailyGrossBuySpent + quote.grossAmount <= PREDICTION_DAILY_GROSS_BUY_LIMIT &&
          input.totalMarketPositionShares + input.quantity <= PREDICTION_MAX_POSITION_SHARES
        : input.positionShares >= input.quantity,
    positionShares: input.positionShares,
    totalMarketPositionShares: input.totalMarketPositionShares,
    limits: {
      maxOrderShares: PREDICTION_MAX_ORDER_SHARES,
      maxPositionShares: PREDICTION_MAX_POSITION_SHARES,
      dailyGrossBuyLimit: PREDICTION_DAILY_GROSS_BUY_LIMIT,
      dailyGrossBuySpent,
      dailyGrossBuyRemaining: Math.max(
        0,
        PREDICTION_DAILY_GROSS_BUY_LIMIT - dailyGrossBuySpent,
      ),
    },
  };
}

export function verifySignedPredictionQuote(input: {
  token: string;
  market: PredictionMarketState;
  outcomeId: string;
  outcome: PredictionOutcomeKey;
  side: PredictionSide;
  quantity: number;
  userId: string;
  now?: Date;
  secret?: string;
}) {
  const payload = decodeQuote(input.token, input.secret);
  const now = (input.now ?? new Date()).getTime();

  if (payload.expiresAt <= now) {
    throw new AppError(
      "This prediction quote expired. Request a fresh quote.",
      409,
      "QUOTE_EXPIRED",
    );
  }
  if (
    payload.userId !== input.userId ||
    payload.marketId !== input.market.id ||
    payload.outcomeId !== input.outcomeId ||
    payload.outcomeKey !== input.outcome ||
    payload.side !== input.side ||
    payload.quantity !== input.quantity
  ) {
    throw new AppError("This quote does not match the requested trade.", 422, "QUOTE_MISMATCH");
  }
  if (
    payload.marketVersion !== input.market.marketVersion ||
    payload.yesSharesBefore !== input.market.yesShares ||
    payload.noSharesBefore !== input.market.noShares
  ) {
    throw new AppError(
      "The prediction quote changed. Request a fresh quote.",
      409,
      "QUOTE_CHANGED",
    );
  }

  const expected = calculatePredictionQuote({
    market: input.market,
    outcome: input.outcome,
    side: input.side,
    quantity: input.quantity,
  });
  if (
    payload.grossAmount !== expected.grossAmount ||
    payload.feeAmount !== expected.feeAmount ||
    payload.netAmount !== expected.netAmount ||
    payload.probabilityBeforeBps !== expected.probabilityBeforeBps ||
    payload.probabilityAfterBps !== expected.probabilityAfterBps ||
    payload.yesSharesBefore !== expected.yesSharesBefore ||
    payload.noSharesBefore !== expected.noSharesBefore ||
    payload.yesSharesAfter !== expected.yesSharesAfter ||
    payload.noSharesAfter !== expected.noSharesAfter
  ) {
    throw new AppError(
      "The prediction quote changed. Request a fresh quote.",
      409,
      "QUOTE_CHANGED",
    );
  }

  return payload;
}

function dbLocale(locale: PredictionLocale): "EN" | "ZH_HANT" {
  return locale === "zh-Hant" ? "ZH_HANT" : "EN";
}

function normalizeLocale(locale?: string | null): PredictionLocale {
  return locale === "zh-Hant" || locale === "ZH_HANT" ? "zh-Hant" : "en";
}

function localizedMarketFields(market: PublicMarketRecord, locale: PredictionLocale) {
  return market.locales.find((entry) => entry.locale === dbLocale(locale));
}

function marketOutcomeKey(outcome: Pick<OutcomeRow, "key">): PredictionOutcomeKey {
  const key = outcome.key.toUpperCase();
  if (key !== "YES" && key !== "NO") {
    throw new AppError("Only binary YES/NO prediction markets are supported.", 500, "INVALID_MARKET");
  }
  return key;
}

function validateBinaryMarket(market: PredictionMarketState & { outcomes: OutcomeRow[] }) {
  const yes = market.outcomes.find((outcome) => outcome.key.toUpperCase() === "YES");
  const no = market.outcomes.find((outcome) => outcome.key.toUpperCase() === "NO");
  if (
    market.outcomes.length !== 2 ||
    !yes ||
    !no ||
    yes.sharesOutstanding !== market.yesShares ||
    no.sharesOutstanding !== market.noShares ||
    market.liquidityParameter !== PREDICTION_LIQUIDITY_PARAMETER ||
    market.payoutPerShare !== PREDICTION_PAYOUT_PER_SHARE
  ) {
    throw new AppError("Prediction market state is inconsistent.", 500, "INVALID_MARKET");
  }
  return { yes, no };
}

function resolveOutcome(
  market: PredictionMarketState & { outcomes: OutcomeRow[] },
  identifier: string,
) {
  validateBinaryMarket(market);
  const normalized = identifier.toUpperCase();
  const outcome = market.outcomes.find(
    (candidate) => candidate.id === identifier || candidate.key.toUpperCase() === normalized,
  );
  if (!outcome) {
    throw new AppError("Prediction outcome not found.", 404, "OUTCOME_NOT_FOUND");
  }
  return { ...outcome, normalizedKey: marketOutcomeKey(outcome) };
}

function toPublicMarket(market: PublicMarketRecord, locale: PredictionLocale) {
  const localized = localizedMarketFields(market, locale);
  const tradingOpen = market.status === "OPEN" && market.closesAt.getTime() > Date.now();
  return {
    id: market.id,
    slug: market.slug,
    question: localized?.question ?? market.question,
    description: localized?.description ?? market.description,
    edgeCaseRules: localized?.edgeCaseRules ?? market.edgeCaseRules,
    status: market.status,
    tradingOpen,
    closesAt: market.closesAt.toISOString(),
    challengeEndsAt: market.challengeEndsAt?.toISOString() ?? null,
    resolvedAt: market.resolvedAt?.toISOString() ?? null,
    timezone: market.timezone,
    resolutionSource: {
      label: market.resolutionSourceLabel,
      url: market.resolutionSourceUrl,
    },
    liquidityParameter: market.liquidityParameter,
    payoutPerShare: market.payoutPerShare,
    marketVersion: market.marketVersion,
    participantCount: market.participantCount,
    tradeCount: market._count?.trades ?? 0,
    outcomes: market.outcomes.map((outcome) => {
      const key = marketOutcomeKey(outcome);
      return {
        id: outcome.id,
        key,
        label: outcome.label,
        sharesOutstanding: outcome.sharesOutstanding,
        probabilityBps: calculateOutcomeProbabilityBps(
          market.yesShares,
          market.noShares,
          key,
          market.liquidityParameter,
        ),
        winning: market.winningOutcomeId === outcome.id,
      };
    }),
    createdAt: market.createdAt.toISOString(),
    updatedAt: market.updatedAt.toISOString(),
  };
}

async function findMarket(db: Db, identifier: string) {
  const market = await db.predictionMarket.findFirst({
    where: { OR: [{ id: identifier }, { slug: identifier }] },
    include: {
      locales: true,
      outcomes: true,
      event: { include: { locales: true } },
      oracleSources: { orderBy: { priority: "asc" } },
      ruleVersions: { orderBy: { version: "desc" }, take: 1 },
      resolutionProposals: {
        orderBy: { proposedAt: "desc" },
        include: { outcome: true, challenges: { orderBy: { createdAt: "asc" } } },
      },
      _count: { select: { trades: true } },
    },
  });
  if (!market) {
    throw new AppError("Prediction market not found.", 404, "PREDICTION_NOT_FOUND");
  }
  return market;
}

function ensurePublicMarket(status: string) {
  if (status === "DRAFT") {
    throw new AppError("Prediction market not found.", 404, "PREDICTION_NOT_FOUND");
  }
}

function ensureTradingOpen(market: { status: string; closesAt: Date }, now: Date) {
  if (market.status !== "OPEN" || market.closesAt.getTime() <= now.getTime()) {
    throw new AppError("This prediction market is not open for trading.", 409, "MARKET_CLOSED");
  }
}

async function requireUser(db: Db, userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AuthenticationError("Your account session is no longer available.");
  }
  return user;
}

async function requireAdmin(db: Db, userId: string) {
  const user = await requireUser(db, userId);
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (
    user.role !== "ADMIN" &&
    (!user.email || !adminEmails.includes(user.email.toLowerCase()))
  ) {
    throw new AuthorizationError("Admin privileges are required.");
  }
  return user;
}

async function withSerializableRetry<T>(operation: (tx: Tx) => Promise<T>) {
  let lastError: unknown;
  const maximumRetries = 3;
  for (let attempt = 0; attempt <= maximumRetries; attempt += 1) {
    try {
      return await prisma.$transaction(operation, transactionOptions);
    } catch (error) {
      lastError = error;
      const retryable = classifyRetryablePrismaConflict(error);
      if (!retryable || attempt === maximumRetries) {
        break;
      }
      await waitForSerializableRetry(attempt + 1);
    }
  }

  if (lastError instanceof AppError) {
    throw lastError;
  }
  const conflict = classifyRetryablePrismaConflict(lastError);
  if (conflict === "UNIQUE_CONFLICT") {
    throw new AppError("A record with this identifier already exists.", 409, "ALREADY_EXISTS");
  }
  if (conflict === "WRITE_CONFLICT") {
    throw new AppError(
      "The market changed while processing the request. Try again.",
      409,
      "TRANSACTION_CONFLICT",
    );
  }
  throw lastError;
}

function requestHash(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function requireIdempotencyKey(key: string) {
  const normalized = key.trim();
  if (normalized.length < 8 || normalized.length > 160) {
    throw new AppError(
      "A valid Idempotency-Key header is required.",
      422,
      "IDEMPOTENCY_KEY_REQUIRED",
    );
  }
  return normalized;
}

function tradeStorageKey(userId: string, marketId: string, key: string) {
  return createHash("sha256")
    .update(`${userId}:${marketId}:${key}`)
    .digest("hex");
}

async function runIdempotentMutation<T>(input: {
  userId: string;
  scope: string;
  key: string;
  payload: unknown;
  operation: (tx: Tx) => Promise<T>;
}) {
  const hash = requestHash(input.payload);
  return withSerializableRetry(async (tx) => {
    const existing = await tx.idempotencyRecord.findUnique({
      where: {
        userId_scope_key: {
          userId: input.userId,
          scope: input.scope,
          key: input.key,
        },
      },
    });
    if (existing) {
      if (existing.requestHash !== hash) {
        throw new AppError(
          "This idempotency key was already used for a different request.",
          409,
          "IDEMPOTENCY_CONFLICT",
        );
      }
      if (existing.completedAt && existing.response) {
        return existing.response as unknown as T;
      }
      throw new AppError("This action is already being processed.", 409, "ACTION_IN_PROGRESS");
    }

    const record = await tx.idempotencyRecord.create({
      data: {
        userId: input.userId,
        scope: input.scope,
        key: input.key,
        requestHash: hash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000),
      },
    });
    const result = await input.operation(tx);
    await tx.idempotencyRecord.update({
      where: { id: record.id },
      data: {
        response: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
    return result;
  });
}

function getHongKongDayBounds(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value;
  const dayKey = `${part("year")}-${part("month")}-${part("day")}`;
  const start = new Date(`${dayKey}T00:00:00+08:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1_000) };
}

async function getDailyGrossBuySpend(db: Db, userId: string, now: Date) {
  const { start, end } = getHongKongDayBounds(now);
  const aggregate = await db.predictionTrade.aggregate({
    where: {
      userId,
      side: "BUY",
      createdAt: { gte: start, lt: end },
    },
    _sum: { grossAmount: true },
  });
  return aggregate._sum.grossAmount ?? 0;
}

async function applyWalletEntries(
  tx: Tx,
  wallet: { id: string; softBalance: number },
  entries: Array<{
    delta: number;
    referenceType:
      | "PREDICTION_BUY"
      | "PREDICTION_SELL"
      | "PREDICTION_FEE"
      | "PREDICTION_PAYOUT"
      | "PREDICTION_REFUND";
    referenceId: string;
    idempotencyKey: string;
  }>,
) {
  let balance = wallet.softBalance;
  for (const entry of entries) {
    const nextBalance = balance + entry.delta;
    if (nextBalance < 0) {
      throw new AppError("Not enough SUP for this action.", 422, "INSUFFICIENT_BALANCE");
    }
    const updated = await tx.wallet.updateMany({
      where: { id: wallet.id, softBalance: balance },
      data: { softBalance: nextBalance },
    });
    if (updated.count !== 1) {
      throw new AppError(
        "The wallet changed while processing the request.",
        409,
        "WALLET_CHANGED",
      );
    }
    await tx.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        currencyType: "SOFT",
        delta: entry.delta,
        balanceAfter: nextBalance,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        idempotencyKey: entry.idempotencyKey,
      },
    });
    balance = nextBalance;
  }
  return balance;
}

async function updateTreasuryBalance(tx: Tx, delta: number) {
  const treasury = await tx.predictionTreasury.findUnique({ where: { id: "system" } });
  if (!treasury) {
    throw new AppError("Prediction treasury is not configured.", 500, "TREASURY_NOT_CONFIGURED");
  }
  const nextBalance = treasury.balance + delta;
  if (nextBalance < treasury.reserved || nextBalance < 0) {
    throw new AppError(
      "Prediction treasury does not have enough available reserve.",
      409,
      "TREASURY_RESERVE_INSUFFICIENT",
    );
  }
  const updated = await tx.predictionTreasury.updateMany({
    where: { id: treasury.id, balance: treasury.balance, reserved: treasury.reserved },
    data: { balance: nextBalance },
  });
  if (updated.count !== 1) {
    throw new AppError("Prediction treasury changed. Try again.", 409, "TREASURY_CHANGED");
  }
  return { ...treasury, balance: nextBalance };
}

async function getRecordedMarketReserve(db: Db) {
  const aggregate = await db.predictionMarket.aggregate({
    where: { reservedLiability: { gt: 0 } },
    _sum: { reservedLiability: true },
  });
  return aggregate._sum.reservedLiability ?? 0;
}

async function requireTreasuryReconciliation(
  db: Db,
  treasury: { reserved: number },
) {
  const marketReserved = await getRecordedMarketReserve(db);
  if (marketReserved !== treasury.reserved) {
    throw new AppError(
      "Prediction treasury reserve does not match open market liabilities.",
      409,
      "TREASURY_RECONCILIATION_FAILED",
    );
  }
  return marketReserved;
}

export async function listPredictionEvents(input: {
  locale?: PredictionLocale;
  cursor?: string;
  limit?: number;
  status?: string;
} = {}) {
  const locale = normalizeLocale(input.locale);
  const limit = Math.max(1, Math.min(input.limit ?? 20, 50));
  const publicStatuses = ["OPEN", "LOCKED", "PROPOSED", "CHALLENGE", "RESOLVED", "VOID"] as const;
  const requestedStatus = input.status?.toUpperCase();
  if (requestedStatus && !publicStatuses.includes(requestedStatus as (typeof publicStatuses)[number])) {
    throw new AppError("Prediction market status is invalid.", 422, "INVALID_STATUS");
  }
  const marketWhere = requestedStatus
    ? { status: requestedStatus as (typeof publicStatuses)[number] }
    : { status: { in: [...publicStatuses] } };

  const events = await prisma.predictionEvent.findMany({
    where: { markets: { some: marketWhere } },
    include: {
      locales: true,
      markets: {
        where: marketWhere,
        include: { locales: true, outcomes: true, _count: { select: { trades: true } } },
        orderBy: [{ status: "asc" }, { closesAt: "asc" }],
      },
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    cursor: input.cursor ? { id: input.cursor } : undefined,
    skip: input.cursor ? 1 : 0,
    take: limit + 1,
  });
  const hasMore = events.length > limit;
  const page = events.slice(0, limit);
  return {
    events: page.map((event) => {
      const localized = event.locales.find((entry) => entry.locale === dbLocale(locale));
      return {
        id: event.id,
        slug: event.slug,
        category: event.category,
        title: localized?.title ?? event.title,
        description: localized?.description ?? event.description,
        featured: event.featured,
        markets: event.markets.map((market) =>
          toPublicMarket(market as PublicMarketRecord, locale),
        ),
      };
    }),
    nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
  };
}

export async function getPredictionEvent(slug: string, locale?: PredictionLocale) {
  const activeLocale = normalizeLocale(locale);
  const event = await prisma.predictionEvent.findFirst({
    where: { OR: [{ id: slug }, { slug }] },
    include: {
      locales: true,
      markets: {
        where: { status: { not: "DRAFT" } },
        include: { locales: true, outcomes: true, _count: { select: { trades: true } } },
        orderBy: { closesAt: "asc" },
      },
    },
  });
  if (!event) {
    throw new AppError("Prediction event not found.", 404, "EVENT_NOT_FOUND");
  }
  const localized = event.locales.find((entry) => entry.locale === dbLocale(activeLocale));
  return {
    id: event.id,
    slug: event.slug,
    category: event.category,
    title: localized?.title ?? event.title,
    description: localized?.description ?? event.description,
    featured: event.featured,
    markets: event.markets.map((market) =>
      toPublicMarket(market as PublicMarketRecord, activeLocale),
    ),
  };
}

export async function getPredictionMarket(
  identifier: string,
  locale?: PredictionLocale,
  userId?: string,
) {
  const activeLocale = normalizeLocale(locale);
  const market = await findMarket(prisma, identifier);
  ensurePublicMarket(market.status);
  validateBinaryMarket(market);
  const eventLocale = market.event.locales.find((entry) => entry.locale === dbLocale(activeLocale));
  const positions = userId
    ? await prisma.predictionPosition.findMany({
        where: { userId, marketId: market.id },
        include: { outcome: true },
      })
    : [];
  return {
    ...toPublicMarket(market as PublicMarketRecord, activeLocale),
    event: {
      id: market.event.id,
      slug: market.event.slug,
      category: market.event.category,
      title: eventLocale?.title ?? market.event.title,
      description: eventLocale?.description ?? market.event.description,
    },
    oracleSources: market.oracleSources.map((source) => ({
      label: source.label,
      url: source.url,
      priority: source.priority,
    })),
    latestRuleVersion: market.ruleVersions[0]
      ? {
          version: market.ruleVersions[0].version,
          snapshot: market.ruleVersions[0].snapshot,
          createdAt: market.ruleVersions[0].createdAt.toISOString(),
        }
      : null,
    resolutionProposals: market.resolutionProposals.map((proposal) => ({
      id: proposal.id,
      status: proposal.status,
      outcome: proposal.outcome
        ? { id: proposal.outcome.id, key: proposal.outcome.key, label: proposal.outcome.label }
        : null,
      evidenceUrl: proposal.evidenceUrl,
      reasoning: proposal.reasoning,
      challengeEndsAt: proposal.challengeEndsAt.toISOString(),
      proposedAt: proposal.proposedAt.toISOString(),
      resolvedAt: proposal.resolvedAt?.toISOString() ?? null,
      challenges: proposal.challenges.map((challenge) => ({
        id: challenge.id,
        reason: challenge.reason,
        evidenceUrl: challenge.evidenceUrl,
        accepted: challenge.accepted,
        createdAt: challenge.createdAt.toISOString(),
      })),
    })),
    myPositions: positions.map((position) => ({
      outcomeId: position.outcomeId,
      outcome: marketOutcomeKey(position.outcome),
      shares: position.shares,
      totalCost: position.totalCost,
      payout: position.payout,
      settledAt: position.settledAt?.toISOString() ?? null,
    })),
  };
}

const historySettings: Record<PredictionHistoryRange, { bucketMs: number; bucketCount: number }> = {
  "24h": { bucketMs: 60 * 60 * 1_000, bucketCount: 24 },
  "7d": { bucketMs: 6 * 60 * 60 * 1_000, bucketCount: 28 },
  "30d": { bucketMs: 24 * 60 * 60 * 1_000, bucketCount: 30 },
};

function yesProbabilityAfterTrade(trade: {
  probabilityAfterBps: number;
  outcome: { key: string };
}) {
  return trade.outcome.key.toUpperCase() === "YES"
    ? trade.probabilityAfterBps
    : 10_000 - trade.probabilityAfterBps;
}

export async function getPredictionHistory(
  identifier: string,
  range: PredictionHistoryRange = "24h",
  now = new Date(),
) {
  const market = await findMarket(prisma, identifier);
  ensurePublicMarket(market.status);
  validateBinaryMarket(market);
  const setting = historySettings[range];
  const end = now.getTime();
  const start = end - setting.bucketMs * setting.bucketCount;
  const [previous, trades] = await Promise.all([
    prisma.predictionTrade.findFirst({
      where: { marketId: market.id, createdAt: { lt: new Date(start) } },
      include: { outcome: { select: { key: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.predictionTrade.findMany({
      where: {
        marketId: market.id,
        createdAt: { gte: new Date(start), lte: now },
      },
      include: { outcome: { select: { key: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  let probabilityBps = previous ? yesProbabilityAfterTrade(previous) : 5_000;
  let tradeIndex = 0;
  const uniqueParticipants = new Set<string>();
  const buckets = Array.from({ length: setting.bucketCount }, (_, index) => {
    const bucketStart = start + index * setting.bucketMs;
    const bucketEnd = bucketStart + setting.bucketMs;
    let grossVolume = 0;
    let buyShares = 0;
    let sellShares = 0;
    let tradeCount = 0;
    while (tradeIndex < trades.length && trades[tradeIndex].createdAt.getTime() < bucketEnd) {
      const trade = trades[tradeIndex];
      probabilityBps = yesProbabilityAfterTrade(trade);
      grossVolume += trade.grossAmount;
      tradeCount += 1;
      uniqueParticipants.add(trade.userId);
      if (trade.side === "BUY") {
        buyShares += trade.quantity;
      } else {
        sellShares += trade.quantity;
      }
      tradeIndex += 1;
    }
    return {
      timestamp: new Date(bucketStart).toISOString(),
      yesProbabilityBps: probabilityBps,
      noProbabilityBps: 10_000 - probabilityBps,
      grossVolume,
      buyShares,
      sellShares,
      tradeCount,
    };
  });
  const currentYesProbabilityBps = calculateOutcomeProbabilityBps(
    market.yesShares,
    market.noShares,
    "YES",
    market.liquidityParameter,
  );
  return {
    marketId: market.id,
    range,
    buckets,
    summary: {
      currentYesProbabilityBps,
      currentNoProbabilityBps: 10_000 - currentYesProbabilityBps,
      changeBps: currentYesProbabilityBps - (buckets[0]?.yesProbabilityBps ?? 5_000),
      grossVolume: trades.reduce((sum, trade) => sum + trade.grossAmount, 0),
      tradeCount: trades.length,
      uniqueParticipants: uniqueParticipants.size,
    },
  };
}

export async function requestPredictionQuote(input: {
  identifier: string;
  outcome: string;
  side: PredictionSide;
  quantity: number;
  userId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const market = await findMarket(prisma, input.identifier);
  ensurePublicMarket(market.status);
  ensureTradingOpen(market, now);
  const outcome = resolveOutcome(market, input.outcome);
  const [wallet, positions, dailyGrossBuySpent] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: input.userId } }),
    prisma.predictionPosition.findMany({ where: { userId: input.userId, marketId: market.id } }),
    getDailyGrossBuySpend(prisma, input.userId, now),
  ]);
  if (!wallet) {
    throw new AppError("Wallet not found.", 404, "WALLET_NOT_FOUND");
  }
  const position = positions.find((entry) => entry.outcomeId === outcome.id);
  const totalPositionShares = positions.reduce((sum, entry) => sum + entry.shares, 0);
  const preview = calculatePredictionQuote({
    market,
    outcome: outcome.normalizedKey,
    side: input.side,
    quantity: input.quantity,
  });

  if (input.side === "BUY") {
    if (totalPositionShares + input.quantity > PREDICTION_MAX_POSITION_SHARES) {
      throw new AppError(
        `A user may hold at most ${PREDICTION_MAX_POSITION_SHARES} shares in one market.`,
        422,
        "POSITION_LIMIT",
      );
    }
    if (dailyGrossBuySpent + preview.grossAmount > PREDICTION_DAILY_GROSS_BUY_LIMIT) {
      throw new AppError(
        `Daily prediction buy spend is limited to ${PREDICTION_DAILY_GROSS_BUY_LIMIT} SUP.`,
        422,
        "DAILY_BUY_LIMIT",
      );
    }
  } else if ((position?.shares ?? 0) < input.quantity) {
    throw new AppError(
      "You cannot sell more prediction shares than you hold.",
      422,
      "INSUFFICIENT_POSITION",
    );
  }

  return createSignedPredictionQuote({
    market,
    outcomeId: outcome.id,
    outcome: outcome.normalizedKey,
    side: input.side,
    quantity: input.quantity,
    userId: input.userId,
    walletBalance: wallet.softBalance,
    positionShares: position?.shares ?? 0,
    totalMarketPositionShares: totalPositionShares,
    dailyGrossBuySpent,
    now,
  });
}

async function executePredictionTrade(input: {
  identifier: string;
  outcome: string;
  side: PredictionSide;
  quantity: number;
  quoteToken: string;
  userId: string;
  idempotencyKey: string;
  now?: Date;
}) {
  const key = requireIdempotencyKey(input.idempotencyKey);
  const resolvedMarket = await findMarket(prisma, input.identifier);
  ensurePublicMarket(resolvedMarket.status);
  const scope = `PREDICTION_TRADE:${resolvedMarket.id}`;
  const now = input.now ?? new Date();

  return runIdempotentMutation({
    userId: input.userId,
    scope,
    key,
    payload: {
      marketId: resolvedMarket.id,
      outcome: input.outcome,
      side: input.side,
      quantity: input.quantity,
      quoteToken: input.quoteToken,
    },
    operation: async (tx) => {
      await requireUser(tx, input.userId);
      const market = await findMarket(tx, resolvedMarket.id);
      ensureTradingOpen(market, now);
      const outcome = resolveOutcome(market, input.outcome);
      const [wallet, positions, dailyGrossBuySpent, previousTradeCount] = await Promise.all([
        tx.wallet.findUnique({ where: { userId: input.userId } }),
        tx.predictionPosition.findMany({
          where: { userId: input.userId, marketId: market.id },
        }),
        getDailyGrossBuySpend(tx, input.userId, now),
        tx.predictionTrade.count({ where: { userId: input.userId, marketId: market.id } }),
      ]);
      if (!wallet) {
        throw new AppError("Wallet not found.", 404, "WALLET_NOT_FOUND");
      }
      const position = positions.find((entry) => entry.outcomeId === outcome.id);
      const totalPositionShares = positions.reduce((sum, entry) => sum + entry.shares, 0);
      const quote = verifySignedPredictionQuote({
        token: input.quoteToken,
        market,
        outcomeId: outcome.id,
        outcome: outcome.normalizedKey,
        side: input.side,
        quantity: input.quantity,
        userId: input.userId,
        now,
      });

      if (input.side === "BUY") {
        if (wallet.softBalance < quote.netAmount) {
          throw new AppError("Not enough SUP for this prediction.", 422, "INSUFFICIENT_BALANCE");
        }
        if (totalPositionShares + input.quantity > PREDICTION_MAX_POSITION_SHARES) {
          throw new AppError(
            `A user may hold at most ${PREDICTION_MAX_POSITION_SHARES} shares in one market.`,
            422,
            "POSITION_LIMIT",
          );
        }
        if (dailyGrossBuySpent + quote.grossAmount > PREDICTION_DAILY_GROSS_BUY_LIMIT) {
          throw new AppError(
            `Daily prediction buy spend is limited to ${PREDICTION_DAILY_GROSS_BUY_LIMIT} SUP.`,
            422,
            "DAILY_BUY_LIMIT",
          );
        }
      } else if (!position || position.shares < input.quantity) {
        throw new AppError(
          "You cannot sell more prediction shares than you hold.",
          422,
          "INSUFFICIENT_POSITION",
        );
      }

      const marketUpdated = await tx.predictionMarket.updateMany({
        where: {
          id: market.id,
          status: "OPEN",
          marketVersion: quote.marketVersion,
          yesShares: quote.yesSharesBefore,
          noShares: quote.noSharesBefore,
          closesAt: { gt: now },
        },
        data: {
          yesShares: quote.yesSharesAfter,
          noShares: quote.noSharesAfter,
          marketVersion: { increment: 1 },
          participantCount:
            input.side === "BUY" && previousTradeCount === 0
              ? { increment: 1 }
              : undefined,
        },
      });
      if (marketUpdated.count !== 1) {
        throw new AppError(
          "The prediction quote changed. Request a fresh quote.",
          409,
          "QUOTE_CHANGED",
        );
      }

      const selectedSupplyBefore = outcome.sharesOutstanding;
      const selectedSupplyAfter =
        outcome.normalizedKey === "YES" ? quote.yesSharesAfter : quote.noSharesAfter;
      const outcomeUpdated = await tx.predictionOutcome.updateMany({
        where: { id: outcome.id, sharesOutstanding: selectedSupplyBefore },
        data: { sharesOutstanding: selectedSupplyAfter },
      });
      if (outcomeUpdated.count !== 1) {
        throw new AppError(
          "The prediction quote changed. Request a fresh quote.",
          409,
          "QUOTE_CHANGED",
        );
      }

      const tradeKey = tradeStorageKey(input.userId, market.id, key);
      const walletBalance =
        input.side === "BUY"
          ? await applyWalletEntries(tx, wallet, [
              {
                delta: -quote.grossAmount,
                referenceType: "PREDICTION_BUY",
                referenceId: market.id,
                idempotencyKey: `prediction:${tradeKey}:principal`,
              },
              {
                delta: -quote.feeAmount,
                referenceType: "PREDICTION_FEE",
                referenceId: market.id,
                idempotencyKey: `prediction:${tradeKey}:fee`,
              },
            ])
          : await applyWalletEntries(tx, wallet, [
              {
                delta: quote.grossAmount,
                referenceType: "PREDICTION_SELL",
                referenceId: market.id,
                idempotencyKey: `prediction:${tradeKey}:principal`,
              },
              {
                delta: -quote.feeAmount,
                referenceType: "PREDICTION_FEE",
                referenceId: market.id,
                idempotencyKey: `prediction:${tradeKey}:fee`,
              },
            ]);
      await updateTreasuryBalance(
        tx,
        input.side === "BUY" ? quote.netAmount : -quote.netAmount,
      );

      let nextPosition;
      if (input.side === "BUY") {
        nextPosition = await tx.predictionPosition.upsert({
          where: { userId_outcomeId: { userId: input.userId, outcomeId: outcome.id } },
          create: {
            userId: input.userId,
            marketId: market.id,
            outcomeId: outcome.id,
            shares: input.quantity,
            totalCost: quote.netAmount,
          },
          update: {
            shares: { increment: input.quantity },
            totalCost: { increment: quote.netAmount },
          },
        });
      } else {
        const existingPosition = position!;
        const nextShares = existingPosition.shares - input.quantity;
        const costReduction =
          nextShares === 0
            ? existingPosition.totalCost
            : Math.floor(
                (existingPosition.totalCost * input.quantity) / existingPosition.shares,
              );
        nextPosition = await tx.predictionPosition.update({
          where: { id: existingPosition.id },
          data: {
            shares: nextShares,
            totalCost: Math.max(0, existingPosition.totalCost - costReduction),
          },
        });
      }

      const trade = await tx.predictionTrade.create({
        data: {
          userId: input.userId,
          marketId: market.id,
          outcomeId: outcome.id,
          side: input.side,
          quantity: input.quantity,
          grossAmount: quote.grossAmount,
          feeAmount: quote.feeAmount,
          netAmount: quote.netAmount,
          probabilityBeforeBps: quote.probabilityBeforeBps,
          probabilityAfterBps: quote.probabilityAfterBps,
          marketVersion: quote.marketVersion + 1,
          idempotencyKey: tradeKey,
        },
      });
      await tx.notification.create({
        data: {
          userId: input.userId,
          title: input.side === "BUY" ? "Prediction added" : "Prediction reduced",
          body: `${input.side === "BUY" ? "Bought" : "Sold"} ${input.quantity} ${outcome.normalizedKey} share${input.quantity > 1 ? "s" : ""}.`,
          type: "TRADE",
          href: `/predictions/${market.slug}`,
          metadata: {
            marketId: market.id,
            outcome: outcome.normalizedKey,
            probabilityAfterBps: quote.probabilityAfterBps,
          },
        },
      });

      return {
        trade: {
          id: trade.id,
          marketId: trade.marketId,
          outcomeId: trade.outcomeId,
          outcome: outcome.normalizedKey,
          side: trade.side,
          quantity: trade.quantity,
          grossAmount: trade.grossAmount,
          feeAmount: trade.feeAmount,
          netAmount: trade.netAmount,
          probabilityBeforeBps: trade.probabilityBeforeBps,
          probabilityAfterBps: trade.probabilityAfterBps,
          marketVersion: trade.marketVersion,
          createdAt: trade.createdAt.toISOString(),
        },
        wallet: { softBalance: walletBalance },
        position: {
          outcomeId: nextPosition.outcomeId,
          outcome: outcome.normalizedKey,
          shares: nextPosition.shares,
          totalCost: nextPosition.totalCost,
        },
        market: {
          yesShares: quote.yesSharesAfter,
          noShares: quote.noSharesAfter,
          marketVersion: quote.marketVersion + 1,
        },
      };
    },
  });
}

export function buyPredictionShares(input: Omit<Parameters<typeof executePredictionTrade>[0], "side">) {
  return executePredictionTrade({ ...input, side: "BUY" });
}

export function sellPredictionShares(input: Omit<Parameters<typeof executePredictionTrade>[0], "side">) {
  return executePredictionTrade({ ...input, side: "SELL" });
}

function ensureHttpsUrl(value: string, field: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError(`${field} must be a valid HTTPS URL.`, 422, "INVALID_URL");
  }
  if (url.protocol !== "https:") {
    throw new AppError(`${field} must use HTTPS.`, 422, "INVALID_URL");
  }
  return url.toString();
}

function validateSlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new AppError(
      "Slug must contain lowercase letters, numbers, and single hyphens only.",
      422,
      "INVALID_SLUG",
    );
  }
  return normalized;
}

interface LocalizedEventInput {
  locale: PredictionLocale;
  title: string;
  description: string;
}

interface LocalizedMarketInput {
  locale: PredictionLocale;
  question: string;
  description: string;
  edgeCaseRules: string;
}

function eventLocaleData(
  locales: LocalizedEventInput[] | undefined,
): Prisma.PredictionEventLocaleCreateWithoutEventInput[] {
  return (locales ?? []).map((entry) => ({
    locale: dbLocale(entry.locale),
    title: entry.title.trim(),
    description: entry.description.trim(),
  }));
}

function marketLocaleData(
  locales: LocalizedMarketInput[] | undefined,
): Prisma.PredictionMarketLocaleCreateWithoutMarketInput[] {
  return (locales ?? []).map((entry) => ({
    locale: dbLocale(entry.locale),
    question: entry.question.trim(),
    description: entry.description.trim(),
    edgeCaseRules: entry.edgeCaseRules.trim(),
  }));
}

function createRuleSnapshot(input: {
  question: string;
  description: string;
  edgeCaseRules: string;
  resolutionSourceUrl: string;
  resolutionSourceLabel: string;
  timezone: string;
  closesAt: Date;
  locales?: LocalizedMarketInput[];
}) {
  return {
    question: input.question,
    description: input.description,
    edgeCaseRules: input.edgeCaseRules,
    resolutionSourceUrl: input.resolutionSourceUrl,
    resolutionSourceLabel: input.resolutionSourceLabel,
    timezone: input.timezone,
    closesAt: input.closesAt.toISOString(),
    liquidityParameter: PREDICTION_LIQUIDITY_PARAMETER,
    payoutPerShare: PREDICTION_PAYOUT_PER_SHARE,
    outcomes: ["YES", "NO"],
    locales: (input.locales ?? []).map((locale) => ({
      locale: locale.locale,
      question: locale.question,
      description: locale.description,
      edgeCaseRules: locale.edgeCaseRules,
    })),
  } as Prisma.InputJsonObject;
}

export async function createPredictionEvent(input: {
  slug: string;
  category: string;
  title: string;
  description: string;
  featured?: boolean;
  locales?: LocalizedEventInput[];
  adminUserId: string;
}) {
  const slug = validateSlug(input.slug);
  return withSerializableRetry(async (tx) => {
    await requireAdmin(tx, input.adminUserId);
    const event = await tx.predictionEvent.create({
      data: {
        slug,
        category: input.category.trim(),
        title: input.title.trim(),
        description: input.description.trim(),
        featured: input.featured ?? false,
        locales: { create: eventLocaleData(input.locales) },
      },
      include: { locales: true },
    });
    return {
      id: event.id,
      slug: event.slug,
      category: event.category,
      title: event.title,
      description: event.description,
      featured: event.featured,
      locales: event.locales,
    };
  });
}

export async function createPredictionMarket(input: {
  eventId: string;
  slug: string;
  question: string;
  description: string;
  resolutionSourceUrl: string;
  resolutionSourceLabel: string;
  edgeCaseRules: string;
  closesAt: Date;
  timezone?: string;
  locales?: LocalizedMarketInput[];
  oracleSources?: Array<{ label: string; url: string; priority?: number }>;
  adminUserId: string;
}) {
  const slug = validateSlug(input.slug);
  const now = new Date();
  if (!Number.isFinite(input.closesAt.getTime()) || input.closesAt <= now) {
    throw new AppError("Prediction close time must be in the future.", 422, "INVALID_CLOSE_TIME");
  }
  const resolutionSourceUrl = ensureHttpsUrl(input.resolutionSourceUrl, "Resolution source");
  const oracleSources = [
    {
      label: input.resolutionSourceLabel.trim(),
      url: resolutionSourceUrl,
      priority: 0,
    },
    ...(input.oracleSources ?? []).map((source) => ({
      label: source.label.trim(),
      url: ensureHttpsUrl(source.url, "Oracle source"),
      priority: source.priority ?? 10,
    })),
  ].filter(
    (source, index, entries) => entries.findIndex((entry) => entry.url === source.url) === index,
  );
  const timezone = input.timezone?.trim() || "Asia/Hong_Kong";
  const ruleInput = {
    question: input.question.trim(),
    description: input.description.trim(),
    edgeCaseRules: input.edgeCaseRules.trim(),
    resolutionSourceUrl,
    resolutionSourceLabel: input.resolutionSourceLabel.trim(),
    timezone,
    closesAt: input.closesAt,
    locales: input.locales,
  };

  return withSerializableRetry(async (tx) => {
    await requireAdmin(tx, input.adminUserId);
    const event = await tx.predictionEvent.findFirst({
      where: { OR: [{ id: input.eventId }, { slug: input.eventId }] },
    });
    if (!event) {
      throw new AppError("Prediction event not found.", 404, "EVENT_NOT_FOUND");
    }
    const market = await tx.predictionMarket.create({
      data: {
        eventId: event.id,
        slug,
        question: ruleInput.question,
        description: ruleInput.description,
        status: "DRAFT",
        resolutionSourceUrl,
        resolutionSourceLabel: ruleInput.resolutionSourceLabel,
        timezone,
        edgeCaseRules: ruleInput.edgeCaseRules,
        closesAt: input.closesAt,
        liquidityParameter: PREDICTION_LIQUIDITY_PARAMETER,
        payoutPerShare: PREDICTION_PAYOUT_PER_SHARE,
        outcomes: {
          create: [
            { key: "YES", label: "Yes" },
            { key: "NO", label: "No" },
          ],
        },
        locales: { create: marketLocaleData(input.locales) },
        oracleSources: { create: oracleSources },
        ruleVersions: {
          create: { version: 1, snapshot: createRuleSnapshot(ruleInput) },
        },
      },
      include: { outcomes: true, locales: true, oracleSources: true, ruleVersions: true },
    });
    return {
      id: market.id,
      slug: market.slug,
      status: market.status,
      question: market.question,
      closesAt: market.closesAt.toISOString(),
      outcomes: market.outcomes,
      locales: market.locales,
      oracleSources: market.oracleSources,
      ruleVersion: market.ruleVersions[0]?.version ?? 1,
    };
  });
}

export async function getPredictionTreasuryStatus() {
  const treasury = await prisma.predictionTreasury.findUnique({ where: { id: "system" } });
  const balance = treasury?.balance ?? 50_000;
  const reserved = treasury?.reserved ?? 0;
  const marketReserved = await getRecordedMarketReserve(prisma);
  const requiredPerDefaultMarket = calculatePredictionMarketReserve();
  return {
    configured: Boolean(treasury),
    balance,
    reserved,
    marketReserved,
    reconciled: reserved === marketReserved,
    available: balance - reserved,
    requiredPerDefaultMarket,
    canOpenDefaultMarket:
      reserved === marketReserved && balance - reserved >= requiredPerDefaultMarket,
  };
}

export async function openPredictionMarket(identifier: string, adminUserId: string) {
  return withSerializableRetry(async (tx) => {
    await requireAdmin(tx, adminUserId);
    const market = await findMarket(tx, identifier);
    if (market.status === "OPEN") {
      return {
        marketId: market.id,
        status: market.status,
        reservedLiability: market.reservedLiability,
        marketVersion: market.marketVersion,
      };
    }
    if (market.status !== "DRAFT") {
      throw new AppError("Only draft markets can be opened.", 409, "INVALID_MARKET_STATUS");
    }
    if (market.closesAt <= new Date()) {
      throw new AppError("Prediction close time must be in the future.", 422, "INVALID_CLOSE_TIME");
    }
    validateBinaryMarket(market);
    const ruleCount = await tx.predictionRuleVersion.count({ where: { marketId: market.id } });
    if (ruleCount < 1 || !market.resolutionSourceUrl || !market.edgeCaseRules.trim()) {
      throw new AppError("Market rules and resolution sources are incomplete.", 422, "RULES_INCOMPLETE");
    }
    const required = calculatePredictionMarketReserve(
      market.liquidityParameter,
      market.payoutPerShare,
    );
    const treasury = await tx.predictionTreasury.upsert({
      where: { id: "system" },
      create: { id: "system", balance: 50_000, reserved: 0 },
      update: {},
    });
    await requireTreasuryReconciliation(tx, treasury);
    if (treasury.balance - treasury.reserved < required) {
      throw new AppError(
        "Prediction treasury does not have enough available reserve.",
        409,
        "TREASURY_RESERVE_INSUFFICIENT",
      );
    }
    const treasuryUpdated = await tx.predictionTreasury.updateMany({
      where: { id: treasury.id, balance: treasury.balance, reserved: treasury.reserved },
      data: { reserved: { increment: required } },
    });
    if (treasuryUpdated.count !== 1) {
      throw new AppError("Prediction treasury changed. Try again.", 409, "TREASURY_CHANGED");
    }
    const marketUpdated = await tx.predictionMarket.updateMany({
      where: { id: market.id, status: "DRAFT", marketVersion: market.marketVersion },
      data: {
        status: "OPEN",
        reservedLiability: required,
        marketVersion: { increment: 1 },
      },
    });
    if (marketUpdated.count !== 1) {
      throw new AppError("Prediction market changed. Try again.", 409, "MARKET_CHANGED");
    }
    return {
      marketId: market.id,
      status: "OPEN" as const,
      reservedLiability: required,
      marketVersion: market.marketVersion + 1,
      treasury: {
        balance: treasury.balance,
        reserved: treasury.reserved + required,
        available: treasury.balance - treasury.reserved - required,
      },
    };
  });
}

export async function lockPredictionMarket(identifier: string, adminUserId: string) {
  return withSerializableRetry(async (tx) => {
    await requireAdmin(tx, adminUserId);
    const market = await findMarket(tx, identifier);
    if (market.status === "LOCKED") {
      return { marketId: market.id, status: market.status, marketVersion: market.marketVersion };
    }
    if (market.status !== "OPEN") {
      throw new AppError("Only open markets can be locked.", 409, "INVALID_MARKET_STATUS");
    }
    const updated = await tx.predictionMarket.updateMany({
      where: { id: market.id, status: "OPEN", marketVersion: market.marketVersion },
      data: { status: "LOCKED", marketVersion: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw new AppError("Prediction market changed. Try again.", 409, "MARKET_CHANGED");
    }
    return { marketId: market.id, status: "LOCKED" as const, marketVersion: market.marketVersion + 1 };
  });
}

export async function updatePredictionMarketRules(input: {
  identifier: string;
  adminUserId: string;
  question?: string;
  description?: string;
  edgeCaseRules?: string;
  resolutionSourceUrl?: string;
  resolutionSourceLabel?: string;
  closesAt?: Date;
  timezone?: string;
  locales?: LocalizedMarketInput[];
  oracleSources?: Array<{ label: string; url: string; priority?: number }>;
}) {
  return withSerializableRetry(async (tx) => {
    await requireAdmin(tx, input.adminUserId);
    const market = await findMarket(tx, input.identifier);
    if (!["DRAFT", "OPEN"].includes(market.status)) {
      throw new AppError("Rules cannot be changed in this market state.", 409, "RULES_LOCKED");
    }
    const tradeCount = await tx.predictionTrade.count({ where: { marketId: market.id } });
    if (tradeCount > 0) {
      throw new AppError("Rules are immutable after the first trade.", 409, "RULES_LOCKED");
    }
    const closesAt = input.closesAt ?? market.closesAt;
    if (!Number.isFinite(closesAt.getTime()) || closesAt <= new Date()) {
      throw new AppError("Prediction close time must be in the future.", 422, "INVALID_CLOSE_TIME");
    }
    const resolutionSourceUrl = input.resolutionSourceUrl
      ? ensureHttpsUrl(input.resolutionSourceUrl, "Resolution source")
      : market.resolutionSourceUrl;
    const ruleInput = {
      question: input.question?.trim() || market.question,
      description: input.description?.trim() || market.description,
      edgeCaseRules: input.edgeCaseRules?.trim() || market.edgeCaseRules,
      resolutionSourceUrl,
      resolutionSourceLabel:
        input.resolutionSourceLabel?.trim() || market.resolutionSourceLabel,
      timezone: input.timezone?.trim() || market.timezone,
      closesAt,
      locales: input.locales,
    };
    const latestVersion = await tx.predictionRuleVersion.findFirst({
      where: { marketId: market.id },
      orderBy: { version: "desc" },
    });
    const updated = await tx.predictionMarket.update({
      where: { id: market.id },
      data: {
        question: ruleInput.question,
        description: ruleInput.description,
        edgeCaseRules: ruleInput.edgeCaseRules,
        resolutionSourceUrl: ruleInput.resolutionSourceUrl,
        resolutionSourceLabel: ruleInput.resolutionSourceLabel,
        timezone: ruleInput.timezone,
        closesAt: ruleInput.closesAt,
        marketVersion: { increment: 1 },
      },
    });
    for (const locale of marketLocaleData(input.locales)) {
      await tx.predictionMarketLocale.upsert({
        where: { marketId_locale: { marketId: market.id, locale: locale.locale } },
        create: { ...locale, marketId: market.id },
        update: locale,
      });
    }
    if (input.oracleSources) {
      const sources = [
        {
          label: ruleInput.resolutionSourceLabel,
          url: ruleInput.resolutionSourceUrl,
          priority: 0,
        },
        ...input.oracleSources.map((source) => ({
          label: source.label.trim(),
          url: ensureHttpsUrl(source.url, "Oracle source"),
          priority: source.priority ?? 10,
        })),
      ].filter(
        (source, index, entries) =>
          entries.findIndex((entry) => entry.url === source.url) === index,
      );
      await tx.oracleSource.deleteMany({ where: { marketId: market.id } });
      await tx.oracleSource.createMany({
        data: sources.map((source) => ({ ...source, marketId: market.id })),
      });
    }
    const ruleVersion = await tx.predictionRuleVersion.create({
      data: {
        marketId: market.id,
        version: (latestVersion?.version ?? 0) + 1,
        snapshot: createRuleSnapshot(ruleInput),
      },
    });
    return {
      marketId: updated.id,
      marketVersion: updated.marketVersion,
      ruleVersion: ruleVersion.version,
      closesAt: updated.closesAt.toISOString(),
    };
  });
}

export async function proposePredictionResolution(input: {
  identifier: string;
  outcome: string;
  evidenceUrl: string;
  reasoning: string;
  adminUserId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const evidenceUrl = ensureHttpsUrl(input.evidenceUrl, "Resolution evidence");
  return withSerializableRetry(async (tx) => {
    await requireAdmin(tx, input.adminUserId);
    const market = await findMarket(tx, input.identifier);
    if (market.status === "OPEN" && market.closesAt > now) {
      throw new AppError("Lock the market before proposing a result.", 409, "MARKET_STILL_OPEN");
    }
    if (!["OPEN", "LOCKED"].includes(market.status)) {
      throw new AppError("This market cannot accept a resolution proposal.", 409, "INVALID_MARKET_STATUS");
    }
    const outcome = resolveOutcome(market, input.outcome);
    const challengeEndsAt = new Date(now.getTime() + PREDICTION_CHALLENGE_WINDOW_MS);
    const proposal = await tx.resolutionProposal.create({
      data: {
        marketId: market.id,
        outcomeId: outcome.id,
        proposedById: input.adminUserId,
        status: "PROPOSED",
        evidenceUrl,
        reasoning: input.reasoning.trim(),
        challengeEndsAt,
        proposedAt: now,
      },
    });
    const updated = await tx.predictionMarket.updateMany({
      where: { id: market.id, marketVersion: market.marketVersion },
      data: {
        status: "PROPOSED",
        challengeEndsAt,
        marketVersion: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new AppError("Prediction market changed. Try again.", 409, "MARKET_CHANGED");
    }
    return {
      proposalId: proposal.id,
      marketId: market.id,
      outcome: outcome.normalizedKey,
      status: proposal.status,
      challengeEndsAt: challengeEndsAt.toISOString(),
    };
  });
}

export async function challengePredictionResolution(input: {
  identifier: string;
  proposalId?: string;
  reason: string;
  evidenceUrl: string;
  userId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const evidenceUrl = ensureHttpsUrl(input.evidenceUrl, "Challenge evidence");
  return withSerializableRetry(async (tx) => {
    await requireUser(tx, input.userId);
    const market = await findMarket(tx, input.identifier);
    if (!["PROPOSED", "CHALLENGE"].includes(market.status)) {
      throw new AppError("This market is not accepting challenges.", 409, "CHALLENGE_CLOSED");
    }
    const proposal = await tx.resolutionProposal.findFirst({
      where: {
        marketId: market.id,
        ...(input.proposalId ? { id: input.proposalId } : {}),
        status: { in: ["PROPOSED", "CHALLENGED"] },
      },
      orderBy: { proposedAt: "desc" },
    });
    if (!proposal || proposal.challengeEndsAt <= now) {
      throw new AppError("The challenge window has closed.", 409, "CHALLENGE_CLOSED");
    }
    const challenge = await tx.resolutionChallenge.create({
      data: {
        proposalId: proposal.id,
        userId: input.userId,
        reason: input.reason.trim(),
        evidenceUrl,
      },
    });
    await tx.resolutionProposal.update({
      where: { id: proposal.id },
      data: { status: "CHALLENGED" },
    });
    await tx.predictionMarket.update({
      where: { id: market.id },
      data: { status: "CHALLENGE", marketVersion: { increment: 1 } },
    });
    return {
      challengeId: challenge.id,
      proposalId: proposal.id,
      marketId: market.id,
      status: "CHALLENGED" as const,
      createdAt: challenge.createdAt.toISOString(),
    };
  });
}

async function updateTreasuryForSettlement(
  tx: Tx,
  market: { reservedLiability: number },
  payout: number,
) {
  const treasury = await tx.predictionTreasury.findUnique({ where: { id: "system" } });
  if (!treasury) {
    if (payout === 0 && market.reservedLiability === 0) {
      return { balance: 50_000, reserved: 0 };
    }
    throw new AppError("Prediction treasury is not configured.", 500, "TREASURY_NOT_CONFIGURED");
  }
  await requireTreasuryReconciliation(tx, treasury);
  const nextBalance = treasury.balance - payout;
  const nextReserved = treasury.reserved - market.reservedLiability;
  if (nextBalance < 0 || nextReserved < 0 || nextBalance < nextReserved) {
    throw new AppError(
      "Prediction treasury cannot cover this settlement.",
      409,
      "TREASURY_RESERVE_INSUFFICIENT",
    );
  }
  const updated = await tx.predictionTreasury.updateMany({
    where: { id: treasury.id, balance: treasury.balance, reserved: treasury.reserved },
    data: { balance: nextBalance, reserved: nextReserved },
  });
  if (updated.count !== 1) {
    throw new AppError("Prediction treasury changed. Try again.", 409, "TREASURY_CHANGED");
  }
  return { balance: nextBalance, reserved: nextReserved };
}

export async function finalizePredictionResolution(input: {
  identifier: string;
  proposalId?: string;
  adminUserId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return withSerializableRetry(async (tx) => {
    await requireAdmin(tx, input.adminUserId);
    const market = await findMarket(tx, input.identifier);
    if (market.status === "RESOLVED") {
      return {
        marketId: market.id,
        status: "RESOLVED" as const,
        winningOutcomeId: market.winningOutcomeId,
        alreadyFinalized: true,
      };
    }
    if (!["PROPOSED", "CHALLENGE"].includes(market.status)) {
      throw new AppError("This market is not ready to finalize.", 409, "INVALID_MARKET_STATUS");
    }
    const proposal = await tx.resolutionProposal.findFirst({
      where: {
        marketId: market.id,
        ...(input.proposalId ? { id: input.proposalId } : {}),
        status: { in: ["PROPOSED", "CHALLENGED"] },
      },
      include: { challenges: true, outcome: true },
      orderBy: { proposedAt: "desc" },
    });
    if (!proposal || !proposal.outcomeId || !proposal.outcome) {
      throw new AppError("Resolution proposal not found.", 404, "PROPOSAL_NOT_FOUND");
    }
    if (proposal.challengeEndsAt > now) {
      throw new AppError("The challenge window is still open.", 409, "CHALLENGE_WINDOW_OPEN");
    }
    if (proposal.challenges.length > 0 && proposal.proposedById === input.adminUserId) {
      throw new AuthorizationError("A challenged result must be finalized by a second administrator.");
    }

    const winningPositions = await tx.predictionPosition.findMany({
      where: { marketId: market.id, outcomeId: proposal.outcomeId, shares: { gt: 0 } },
      include: { user: { include: { wallet: true } } },
    });
    const totalPayout = winningPositions.reduce(
      (sum, position) => sum + position.shares * market.payoutPerShare,
      0,
    );
    const treasury = await updateTreasuryForSettlement(tx, market, totalPayout);
    const settledAt = now;
    await tx.predictionPosition.updateMany({
      where: { marketId: market.id },
      data: { settledAt, payout: 0 },
    });
    for (const position of winningPositions) {
      if (!position.user.wallet) {
        throw new AppError("Winner wallet not found.", 500, "WALLET_NOT_FOUND");
      }
      const payout = position.shares * market.payoutPerShare;
      await applyWalletEntries(tx, position.user.wallet, [
        {
          delta: payout,
          referenceType: "PREDICTION_PAYOUT",
          referenceId: market.id,
          idempotencyKey: `prediction-payout:${market.id}:${position.id}`,
        },
      ]);
      await tx.predictionPosition.update({
        where: { id: position.id },
        data: { payout },
      });
    }
    await tx.resolutionChallenge.updateMany({
      where: { proposalId: proposal.id },
      data: { accepted: false },
    });
    await tx.resolutionProposal.update({
      where: { id: proposal.id },
      data: { status: "CONFIRMED", resolvedAt: settledAt },
    });
    await tx.predictionMarket.update({
      where: { id: market.id },
      data: {
        status: "RESOLVED",
        winningOutcomeId: proposal.outcomeId,
        resolvedAt: settledAt,
        challengeEndsAt: proposal.challengeEndsAt,
        reservedLiability: 0,
        marketVersion: { increment: 1 },
      },
    });
    return {
      marketId: market.id,
      status: "RESOLVED" as const,
      winningOutcomeId: proposal.outcomeId,
      winningOutcome: marketOutcomeKey(proposal.outcome),
      totalPayout,
      winnerCount: winningPositions.length,
      resolvedAt: settledAt.toISOString(),
      treasury,
    };
  });
}

export function calculateVoidRefunds(
  trades: Array<{ userId: string; side: PredictionSide; netAmount: number }>,
) {
  const flows = new Map<string, number>();
  for (const trade of trades) {
    const current = flows.get(trade.userId) ?? 0;
    flows.set(
      trade.userId,
      current + (trade.side === "BUY" ? trade.netAmount : -trade.netAmount),
    );
  }
  return [...flows.entries()]
    .map(([userId, netHistoricalLossAndFees]) => ({
      userId,
      amount: Math.max(0, netHistoricalLossAndFees),
    }))
    .filter((refund) => refund.amount > 0);
}

export async function voidPredictionMarket(input: {
  identifier: string;
  reason: string;
  adminUserId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return withSerializableRetry(async (tx) => {
    await requireAdmin(tx, input.adminUserId);
    const market = await findMarket(tx, input.identifier);
    if (market.status === "VOID") {
      return { marketId: market.id, status: "VOID" as const, alreadyVoided: true };
    }
    if (market.status === "RESOLVED") {
      throw new AppError("A resolved market cannot be voided.", 409, "INVALID_MARKET_STATUS");
    }
    const trades = await tx.predictionTrade.findMany({
      where: { marketId: market.id },
      select: { userId: true, side: true, netAmount: true },
    });
    const refunds = calculateVoidRefunds(trades);
    const totalRefund = refunds.reduce((sum, refund) => sum + refund.amount, 0);
    const treasury = await updateTreasuryForSettlement(tx, market, totalRefund);
    const positions = await tx.predictionPosition.findMany({
      where: { marketId: market.id },
      include: { user: { include: { wallet: true } } },
      orderBy: { id: "asc" },
    });
    await tx.predictionPosition.updateMany({
      where: { marketId: market.id },
      data: { settledAt: now, payout: 0 },
    });
    for (const refund of refunds) {
      const userPositions = positions.filter((position) => position.userId === refund.userId);
      const wallet = userPositions[0]?.user.wallet;
      if (!wallet) {
        throw new AppError("Refund wallet not found.", 500, "WALLET_NOT_FOUND");
      }
      await applyWalletEntries(tx, wallet, [
        {
          delta: refund.amount,
          referenceType: "PREDICTION_REFUND",
          referenceId: market.id,
          idempotencyKey: `prediction-refund:${market.id}:${refund.userId}`,
        },
      ]);
      if (userPositions[0]) {
        await tx.predictionPosition.update({
          where: { id: userPositions[0].id },
          data: { payout: refund.amount },
        });
      }
    }
    await tx.resolutionProposal.updateMany({
      where: { marketId: market.id, status: { in: ["PROPOSED", "CHALLENGED"] } },
      data: { status: "VOIDED", resolvedAt: now },
    });
    await tx.resolutionProposal.create({
      data: {
        marketId: market.id,
        outcomeId: null,
        proposedById: input.adminUserId,
        status: "VOIDED",
        evidenceUrl: market.resolutionSourceUrl,
        reasoning: input.reason.trim(),
        challengeEndsAt: now,
        proposedAt: now,
        resolvedAt: now,
      },
    });
    await tx.resolutionChallenge.updateMany({
      where: { proposal: { marketId: market.id }, accepted: null },
      data: { accepted: true },
    });
    await tx.predictionMarket.update({
      where: { id: market.id },
      data: {
        status: "VOID",
        winningOutcomeId: null,
        resolvedAt: now,
        reservedLiability: 0,
        marketVersion: { increment: 1 },
      },
    });
    return {
      marketId: market.id,
      status: "VOID" as const,
      reason: input.reason.trim(),
      totalRefund,
      refundedUsers: refunds.length,
      refunds,
      resolvedAt: now.toISOString(),
      treasury,
    };
  });
}
