import { describe, expect, it } from "vitest";
import { dailyCoverIndex, selectDailyCover } from "@/lib/editorial-cover";

describe("daily editorial cover", () => {
  it("keeps the cover stable throughout the same Hong Kong day", () => {
    expect(dailyCoverIndex("2026-08-21", 6)).toBe(dailyCoverIndex("2026-08-21", 6));
    expect(selectDailyCover(["Akari", "Tohka", "Kurumi"], "2026-08-21")).toBe(
      selectDailyCover(["Akari", "Tohka", "Kurumi"], "2026-08-21"),
    );
  });

  it("always selects a valid published candidate", () => {
    for (const dayKey of ["2026-08-21", "2026-08-22", "2026-09-01"]) {
      expect(dailyCoverIndex(dayKey, 6)).toBeGreaterThanOrEqual(0);
      expect(dailyCoverIndex(dayKey, 6)).toBeLessThan(6);
    }
  });

  it("handles an empty cover desk", () => {
    expect(dailyCoverIndex("2026-08-21", 0)).toBe(-1);
    expect(selectDailyCover([], "2026-08-21")).toBeUndefined();
  });
});
