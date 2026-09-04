import { describe, expect, it } from "vitest";
import { getExchangeFeatureFlags, parseFeatureFlag } from "@/lib/feature-flags";

describe("exchange feature flags", () => {
  it("keeps the V3 experience enabled unless explicitly disabled", () => {
    expect(getExchangeFeatureFlags({})).toEqual({
      community: true,
      predictions: true,
      submissions: true,
    });
  });

  it("recognizes common disabled values", () => {
    for (const value of ["0", "false", "FALSE", "off", "no"]) {
      expect(parseFeatureFlag(value, true)).toBe(false);
    }
  });

  it("allows submissions to be paused without hiding public community pages", () => {
    expect(
      getExchangeFeatureFlags({
        FEATURE_COMMUNITY: "true",
        FEATURE_PREDICTIONS: "true",
        FEATURE_SUBMISSIONS: "false",
      }),
    ).toEqual({ community: true, predictions: true, submissions: false });
  });
});
