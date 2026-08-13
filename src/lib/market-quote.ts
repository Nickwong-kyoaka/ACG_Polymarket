import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/api";
import {
  calculateBuyBatchCost,
  calculateSellBatchReturn,
} from "@/lib/market";
import { prisma } from "@/lib/prisma";

export const MARKET_QUOTE_TTL_MS = 30_000;

export type MarketQuoteSide = "BUY" | "SELL";

export interface QuoteCharacter {
  id: string;
  basePrice: number;
  priceStep: number;
  unitsPerStep: number;
  circulatingUnits: number;
  marketVersion: number;
}

interface SignedQuotePayload {
  version: 1;
  userId: string;
  characterId: string;
  side: MarketQuoteSide;
  quantity: number;
  marketVersion: number;
  supplyBefore: number;
  supplyAfter: number;
  total: number;
  averagePrice: number;
  firstPrice: number;
  lastPrice: number;
  quoteBefore: number;
  quoteAfter: number;
  issuedAt: number;
  expiresAt: number;
}

export interface MarketQuoteResponse {
  quoteToken: string;
  expiresAt: string;
  characterId: string;
  side: MarketQuoteSide;
  quantity: number;
  currency: "SUP";
  marketVersion: number;
  supplyBefore: number;
  supplyAfter: number;
  total: number;
  averagePrice: number;
  firstPrice: number;
  lastPrice: number;
  quoteBefore: number;
  quoteAfter: number;
  affordable: boolean;
  availableUnits: number;
}

function quoteSecret(override?: string) {
  const secret =
    override ??
    process.env.MARKET_QUOTE_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new AppError("Market quote signing is not configured.", 500, "QUOTE_CONFIG_ERROR");
  }

  return secret ?? "local-market-quote-secret";
}

function sign(payload: string, secret?: string) {
  return createHmac("sha256", quoteSecret(secret)).update(payload).digest("base64url");
}

function encode(payload: SignedQuotePayload, secret?: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

function decode(token: string, secret?: string): SignedQuotePayload {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) {
    throw new AppError("The market quote token is invalid.", 422, "INVALID_QUOTE");
  }

  const expected = sign(body, secret);
  const valid =
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) {
    throw new AppError("The market quote token is invalid.", 422, "INVALID_QUOTE");
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SignedQuotePayload;
    if (payload.version !== 1) {
      throw new Error("Unsupported quote version");
    }
    return payload;
  } catch {
    throw new AppError("The market quote token is invalid.", 422, "INVALID_QUOTE");
  }
}

function calculateExecution(character: QuoteCharacter, side: MarketQuoteSide, quantity: number) {
  if (side === "BUY") {
    const execution = calculateBuyBatchCost(character, quantity);
    return {
      total: execution.totalCost,
      averagePrice: execution.averageUnitPrice,
      firstPrice: execution.firstUnitPrice,
      lastPrice: execution.lastUnitPrice,
      quoteBefore: execution.quoteBefore,
      quoteAfter: execution.quoteAfter,
      supplyBefore: execution.supplyBefore,
      supplyAfter: execution.supplyAfter,
    };
  }

  const execution = calculateSellBatchReturn(character, quantity);
  return {
    total: execution.totalReturn,
    averagePrice: execution.averageUnitPrice,
    firstPrice: execution.firstUnitPrice,
    lastPrice: execution.lastUnitPrice,
    quoteBefore: execution.quoteBefore,
    quoteAfter: execution.quoteAfter,
    supplyBefore: execution.supplyBefore,
    supplyAfter: execution.supplyAfter,
  };
}

export function createSignedMarketQuote(input: {
  character: QuoteCharacter;
  side: MarketQuoteSide;
  quantity: number;
  userId: string;
  walletBalance: number;
  positionUnits: number;
  now?: Date;
  secret?: string;
}): MarketQuoteResponse {
  const now = input.now ?? new Date();
  const execution = calculateExecution(input.character, input.side, input.quantity);
  const payload: SignedQuotePayload = {
    version: 1,
    userId: input.userId,
    characterId: input.character.id,
    side: input.side,
    quantity: input.quantity,
    marketVersion: input.character.marketVersion,
    ...execution,
    issuedAt: now.getTime(),
    expiresAt: now.getTime() + MARKET_QUOTE_TTL_MS,
  };

  return {
    quoteToken: encode(payload, input.secret),
    expiresAt: new Date(payload.expiresAt).toISOString(),
    characterId: payload.characterId,
    side: payload.side,
    quantity: payload.quantity,
    currency: "SUP",
    marketVersion: payload.marketVersion,
    supplyBefore: payload.supplyBefore,
    supplyAfter: payload.supplyAfter,
    total: payload.total,
    averagePrice: payload.averagePrice,
    firstPrice: payload.firstPrice,
    lastPrice: payload.lastPrice,
    quoteBefore: payload.quoteBefore,
    quoteAfter: payload.quoteAfter,
    affordable:
      input.side === "BUY"
        ? input.walletBalance >= payload.total
        : input.positionUnits >= input.quantity,
    availableUnits: input.positionUnits,
  };
}

export function verifySignedMarketQuote(input: {
  token: string;
  character: QuoteCharacter;
  side: MarketQuoteSide;
  quantity: number;
  userId: string;
  now?: Date;
  secret?: string;
}) {
  const payload = decode(input.token, input.secret);
  const now = (input.now ?? new Date()).getTime();

  if (payload.expiresAt <= now) {
    throw new AppError("This market quote expired. Request a fresh quote.", 409, "QUOTE_EXPIRED");
  }
  if (
    payload.userId !== input.userId ||
    payload.characterId !== input.character.id ||
    payload.side !== input.side ||
    payload.quantity !== input.quantity
  ) {
    throw new AppError("This quote does not match the requested trade.", 422, "QUOTE_MISMATCH");
  }
  if (
    payload.marketVersion !== input.character.marketVersion ||
    payload.supplyBefore !== input.character.circulatingUnits
  ) {
    throw new AppError("The support quote changed. Request a fresh quote.", 409, "QUOTE_CHANGED");
  }

  const expected = calculateExecution(input.character, input.side, input.quantity);
  if (
    expected.total !== payload.total ||
    expected.averagePrice !== payload.averagePrice ||
    expected.firstPrice !== payload.firstPrice ||
    expected.lastPrice !== payload.lastPrice ||
    expected.quoteBefore !== payload.quoteBefore ||
    expected.quoteAfter !== payload.quoteAfter ||
    expected.supplyAfter !== payload.supplyAfter
  ) {
    throw new AppError("The support quote changed. Request a fresh quote.", 409, "QUOTE_CHANGED");
  }

  return payload;
}

export async function requestMarketQuote(input: {
  identifier: string;
  side: MarketQuoteSide;
  quantity: number;
  userId?: string;
  now?: Date;
}) {
  const character = await prisma.character.findFirst({
    where: {
      publishStatus: "PUBLISHED",
      OR: [{ id: input.identifier }, { slug: input.identifier }],
    },
    select: {
      id: true,
      basePrice: true,
      priceStep: true,
      unitsPerStep: true,
      circulatingUnits: true,
      marketVersion: true,
    },
  });
  if (!character) {
    throw new AppError("Character not found.", 404, "CHARACTER_NOT_FOUND");
  }
  const [wallet, position] = input.userId
    ? await Promise.all([
        prisma.wallet.findUnique({ where: { userId: input.userId } }),
        prisma.supportPosition.findUnique({
          where: { userId_characterId: { userId: input.userId, characterId: character.id } },
        }),
      ])
    : [null, null];
  if (input.userId && !wallet) {
    throw new AppError("Wallet not found.", 404, "WALLET_NOT_FOUND");
  }
  if (input.userId && input.side === "SELL" && (position?.units ?? 0) < input.quantity) {
    throw new AppError(
      "You cannot sell more support units than you hold.",
      422,
      "INSUFFICIENT_POSITION",
    );
  }

  return createSignedMarketQuote({
    character,
    side: input.side,
    quantity: input.quantity,
    userId: input.userId ?? "public-preview",
    walletBalance: wallet?.softBalance ?? 0,
    positionUnits: position?.units ?? 0,
    now: input.now,
  });
}
