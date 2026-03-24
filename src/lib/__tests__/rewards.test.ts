import { describe, expect, it } from "vitest";
import { canClaimAdReward, canClaimDailyReward } from "@/lib/market";
import { seedSnapshot } from "@/data/seed";

describe("reward guards", () => {
  it("blocks a second daily claim on the same Hong Kong day", () => {
    expect(canClaimDailyReward(seedSnapshot.dailyRewardClaims, "viewer-001")).toBe(false);
  });

  it("allows ad claims until the daily cap is reached", () => {
    expect(canClaimAdReward(seedSnapshot.adRewardClaims, "viewer-001")).toBe(true);
  });
});
