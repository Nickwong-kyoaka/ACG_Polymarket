import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const homePage = fs.readFileSync(path.resolve(__dirname, "../../app/page.tsx"), "utf8");
const rulesPage = fs.readFileSync(
  path.resolve(__dirname, "../../app/help/market-rules/page.tsx"),
  "utf8",
);

describe("anti-conflict UI copy", () => {
  it("includes explicit no-shorting guidance", () => {
    expect(homePage).toContain("No shorting");
    expect(rulesPage).toContain("There is no shorting");
  });

  it("avoids rivalry-first language", () => {
    expect(homePage.toLowerCase()).not.toContain("loser board");
    expect(homePage.toLowerCase()).not.toContain("beat yours");
  });
});
