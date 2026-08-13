import {
  AD_REWARD,
  AD_REWARD_DAILY_LIMIT,
  DAILY_CHECK_IN_REWARD,
  MAX_BATCH_UNITS,
} from "@/lib/constants";
import type { AdRewardClaim, Character, DailyRewardClaim } from "@/lib/types";
import { getHongKongDayKey } from "@/lib/time";

type PriceCharacter = Pick<
  Character,
  "basePrice" | "priceStep" | "unitsPerStep" | "circulatingUnits"
>;

export function getBuyQuote(
  character: PriceCharacter,
  circulatingUnits = character.circulatingUnits,
) {
  return (
    character.basePrice +
    Math.floor(circulatingUnits / character.unitsPerStep) * character.priceStep
  );
}

export function getSellQuote(
  character: PriceCharacter,
  circulatingUnits = character.circulatingUnits,
) {
  return Math.max(1, Math.floor(getBuyQuote(character, circulatingUnits) * 0.95));
}

export function calculateBuyBatchCost(character: PriceCharacter, quantity: number) {
  if (quantity < 1 || quantity > MAX_BATCH_UNITS) {
    throw new Error(`Quantity must be between 1 and ${MAX_BATCH_UNITS}.`);
  }

  const supplyBefore = character.circulatingUnits;
  const quoteBefore = getBuyQuote(character, supplyBefore);
  let totalCost = 0;
  let firstUnitPrice = quoteBefore;
  let lastUnitPrice = quoteBefore;

  for (let index = 0; index < quantity; index += 1) {
    lastUnitPrice = getBuyQuote(character, character.circulatingUnits + index);
    if (index === 0) {
      firstUnitPrice = lastUnitPrice;
    }
    totalCost += lastUnitPrice;
  }

  const supplyAfter = supplyBefore + quantity;
  return {
    totalCost,
    unitPrice: lastUnitPrice,
    firstUnitPrice,
    lastUnitPrice,
    averageUnitPrice: Math.round(totalCost / quantity),
    quoteBefore,
    quoteAfter: getBuyQuote(character, supplyAfter),
    supplyBefore,
    supplyAfter,
  };
}

export function calculateSellBatchReturn(character: PriceCharacter, quantity: number) {
  if (quantity < 1 || quantity > MAX_BATCH_UNITS) {
    throw new Error(`Quantity must be between 1 and ${MAX_BATCH_UNITS}.`);
  }
  if (quantity > character.circulatingUnits) {
    throw new Error("Quantity cannot exceed circulating support units.");
  }

  const supplyBefore = character.circulatingUnits;
  const quoteBefore = getBuyQuote(character, supplyBefore);
  let totalReturn = 0;
  let firstUnitPrice = getSellQuote(character, Math.max(supplyBefore - 1, 0));
  let lastUnitPrice = firstUnitPrice;

  for (let index = 0; index < quantity; index += 1) {
    const unitsAfterSell = Math.max(character.circulatingUnits - index - 1, 0);
    lastUnitPrice = getSellQuote(character, unitsAfterSell);
    if (index === 0) {
      firstUnitPrice = lastUnitPrice;
    }
    totalReturn += lastUnitPrice;
  }

  const supplyAfter = supplyBefore - quantity;
  return {
    totalReturn,
    unitPrice: lastUnitPrice,
    firstUnitPrice,
    lastUnitPrice,
    averageUnitPrice: Math.round(totalReturn / quantity),
    quoteBefore,
    quoteAfter: getBuyQuote(character, supplyAfter),
    supplyBefore,
    supplyAfter,
  };
}

export function canClaimDailyReward(
  claims: DailyRewardClaim[],
  userId: string,
  date = new Date(),
) {
  const dayKey = getHongKongDayKey(date);
  return !claims.some((claim) => claim.userId === userId && claim.dayKey === dayKey);
}

export function canClaimAdReward(claims: AdRewardClaim[], userId: string, date = new Date()) {
  const dayKey = getHongKongDayKey(date);
  return (
    claims.filter((claim) => claim.userId === userId && claim.dayKey === dayKey).length <
    AD_REWARD_DAILY_LIMIT
  );
}

export function getDailyRewardValue() {
  return DAILY_CHECK_IN_REWARD;
}

export function getAdRewardValue() {
  return AD_REWARD;
}
