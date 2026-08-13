import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const localizedCopy = fs.readFileSync(path.resolve(__dirname, "../../components/acg-locale.ts"), "utf8");
const rulesPage = fs.readFileSync(
  path.resolve(__dirname, "../../app/[locale]/help/market-rules/page.tsx"),
  "utf8",
);

describe("anti-conflict UI copy", () => {
  it("includes explicit no-shorting guidance", () => {
    expect(localizedCopy).toContain("No shorting");
    expect(rulesPage).toContain("There is no shorting");
  });

  it("avoids rivalry-first language", () => {
    expect(localizedCopy.toLowerCase()).not.toContain("loser board");
    expect(localizedCopy.toLowerCase()).not.toContain("beat yours");
  });
});
