import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const localizedCopy = fs.readFileSync(path.resolve(__dirname, "../../components/acg-locale.ts"), "utf8");
const rulesPage = fs.readFileSync(
  path.resolve(__dirname, "../../app/[locale]/help/market-rules/page.tsx"),
  "utf8",
);

describe("welcoming product copy", () => {
  it("explains the product through actions and room language", () => {
    expect(localizedCopy).toContain("holds this quote for 30 seconds");
    expect(rulesPage).toContain("Source notes travel with every image");
  });

  it("keeps defensive prohibition copy out of the main interface", () => {
    const publicCopy = `${localizedCopy}\n${rulesPage}`.toLowerCase();
    expect(publicCopy).not.toContain("no shorting");
    expect(publicCopy).not.toContain("loser board");
    expect(publicCopy).not.toContain("faction war");
    expect(publicCopy).not.toContain("不做空");
    expect(publicCopy).not.toContain("敗者榜");
  });
});
