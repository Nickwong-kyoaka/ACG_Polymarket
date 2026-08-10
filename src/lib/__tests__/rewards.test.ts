import { describe, expect, it } from "vitest";
import { canClaimAdReward, canClaimDailyReward } from "@/lib/market";
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
});
