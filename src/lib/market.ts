import {
  AD_REWARD,
  AD_REWARD_DAILY_LIMIT,
  DAILY_CHECK_IN_REWARD,
  MAX_BATCH_UNITS,
} from "@/lib/constants";
import type { AdRewardClaim, Character, DailyRewardClaim } from "@/lib/types";
import { getHongKongDayKey } from "@/lib/time";

export function getBuyQuote(character: Character, circulatingUnits = character.circulatingUnits) {
  return (
    character.basePrice +
    Math.floor(circulatingUnits / character.unitsPerStep) * character.priceStep
  );
}

export function getSellQuote(character: Character, circulatingUnits = character.circulatingUnits) {
  return Math.max(1, Math.floor(getBuyQuote(character, circulatingUnits) * 0.95));
}

export function calculateBuyBatchCost(character: Character, quantity: number) {
  if (quantity < 1 || quantity > MAX_BATCH_UNITS) {
    throw new Error(`Quantity must be between 1 and ${MAX_BATCH_UNITS}.`);
  }

  let totalCost = 0;
  let lastUnitPrice = getBuyQuote(character);

  for (let index = 0; index < quantity; index += 1) {
    lastUnitPrice = getBuyQuote(character, character.circulatingUnits + index);
    totalCost += lastUnitPrice;
  }

  return { totalCost, unitPrice: lastUnitPrice };
}

export function calculateSellBatchReturn(character: Character, quantity: number) {
  if (quantity < 1 || quantity > MAX_BATCH_UNITS) {
    throw new Error(`Quantity must be between 1 and ${MAX_BATCH_UNITS}.`);
  }

  let totalReturn = 0;
  let lastUnitPrice = getSellQuote(character);

  for (let index = 0; index < quantity; index += 1) {
    const unitsAfterSell = Math.max(character.circulatingUnits - index - 1, 0);
    lastUnitPrice = getSellQuote(character, unitsAfterSell);
    totalReturn += lastUnitPrice;
  }

  return { totalReturn, unitPrice: lastUnitPrice };
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
