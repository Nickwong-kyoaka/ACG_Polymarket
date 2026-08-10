import { describe, expect, it } from "vitest";
import { COMFORT_MODES, matchComfortMode } from "@/lib/comfort";

describe("comfort mode matching", () => {
  it("keeps the MVP comfort menu stable", () => {
    expect(COMFORT_MODES.map((mode) => mode.key)).toEqual([
      "lonely",
      "stress",
      "study_fatigue",
      "sleep",
      "low_confidence",
      "heartbreak",
    ]);
  });

  it("matches stress language to a grounding comfort mode", () => {
    const result = matchComfortMode({
      need: "I feel anxious and overwhelmed before a deadline",
      tags: ["pressure"],
    });

    expect(result.mode.key).toBe("stress");
    expect(result.score).toBeGreaterThan(0);
    expect(result.matchedKeywords).toEqual(expect.arrayContaining(["anxious", "overwhelmed"]));
  });

  it("uses late local hours as a sleep hint when no need is provided", () => {
    expect(matchComfortMode({ localHour: 23 }).mode.key).toBe("sleep");
  });
});
