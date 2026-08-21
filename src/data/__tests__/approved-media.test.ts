import { describe, expect, it } from "vitest";
import { approvedMediaManifest, validateApprovedMediaManifest } from "@/data/approved-media";

describe("owner-approved media manifest", () => {
  it("records every reviewed candidate without treating approval as a license", () => {
    expect(validateApprovedMediaManifest()).toEqual([]);
    expect(approvedMediaManifest.entries).toHaveLength(31);
    expect(approvedMediaManifest.legalNotice).toContain("not evidence of a copyright license");
    expect(approvedMediaManifest.realAdsAllowed).toBe(false);
    expect(approvedMediaManifest.thirdPartyBytesCommittedToGit).toBe(false);
  });

  it("publishes character-matching references and keeps logo-only candidates in review", () => {
    const publishable = approvedMediaManifest.entries.filter((entry) => entry.publicationDecision === "PUBLISH_UNVERIFIED");
    const reviewOnly = approvedMediaManifest.entries.filter((entry) => entry.publicationDecision === "REVIEW_ONLY");

    expect(publishable).toHaveLength(28);
    expect(reviewOnly.map((entry) => entry.characterSlug).sort()).toEqual([
      "roxy-migurdia",
      "rudeus-greyrat",
      "sylphiette",
    ]);
    expect(publishable.every((entry) => entry.permissionStatus === "UNVERIFIED" && !entry.adEligible)).toBe(true);
  });
});
