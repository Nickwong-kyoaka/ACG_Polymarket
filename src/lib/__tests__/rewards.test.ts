import { describe, expect, it } from "vitest";
import {
  canClaimAdReward,
  canClaimDailyReward,
  getAdRewardValue,
  getDailyRewardValue,
} from "@/lib/market";
import type { AdRewardClaim, DailyRewardClaim } from "@/lib/types";

describe("reward guards", () => {
  const rewardDate = new Date("2026-03-25T10:00:00.000+08:00");
  const dailyClaims: DailyRewardClaim[] = [
    {
      id: "daily-001",
      userId: "viewer-001",
      dayKey: "2026-03-25",
      amount: 100,
      claimedAt: rewardDate.toISOString(),
    },
  ];
  const adClaims: AdRewardClaim[] = [
    {
      id: "ad-001",
      userId: "viewer-001",
      dayKey: "2026-03-25",
      slot: 1,
      amount: 20,
      claimedAt: rewardDate.toISOString(),
    },
  ];

  it("blocks a second daily claim on the same Hong Kong day", () => {
    expect(canClaimDailyReward(dailyClaims, "viewer-001", rewardDate)).toBe(false);
  });

  it("allows ad claims until the daily cap is reached", () => {
    expect(canClaimAdReward(adClaims, "viewer-001", rewardDate)).toBe(true);
  });

  it("blocks the fourth ad claim on the same Hong Kong day", () => {
    const cappedClaims = Array.from({ length: 3 }, (_, index) => ({
      ...adClaims[0],
      id: `ad-00${index + 1}`,
    }));

    expect(canClaimAdReward(cappedClaims, "viewer-001", rewardDate)).toBe(false);
  });

  it("allows claims for another user and after the Hong Kong day changes", () => {
    expect(canClaimDailyReward(dailyClaims, "viewer-002", rewardDate)).toBe(true);
    expect(
      canClaimDailyReward(dailyClaims, "viewer-001", new Date("2026-03-26T00:00:00.000+08:00")),
    ).toBe(true);
  });

  it("keeps the published soft-token reward values stable", () => {
    expect(getDailyRewardValue()).toBe(100);
    expect(getAdRewardValue()).toBe(20);
  });
});
