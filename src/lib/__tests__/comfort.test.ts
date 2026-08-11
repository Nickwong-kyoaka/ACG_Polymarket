import { describe, expect, it } from "vitest";
import { matchComfortMode } from "@/lib/comfort";

const modes = [
  { slug: "loneliness" },
  { slug: "stress" },
  { slug: "study-fatigue" },
  { slug: "sleep" },
  { slug: "low-confidence" },
  { slug: "heartbreak" },
];

describe("comfort mode matching", () => {
  it("matches common emotional needs to comfort rooms", () => {
    expect(matchComfortMode("I feel lonely tonight", modes)).toBe("loneliness");
    expect(matchComfortMode("exam pressure is too much", modes)).toBe("stress");
    expect(matchComfortMode("讀書讀到好累", modes)).toBe("study-fatigue");
  });

  it("falls back to the first available mode", () => {
    expect(matchComfortMode("just checking the room", modes)).toBe("loneliness");
  });
});
