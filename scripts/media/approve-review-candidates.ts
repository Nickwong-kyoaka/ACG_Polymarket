import fs from "node:fs/promises";
import path from "node:path";
import { catalogCharactersV2 } from "../../src/data/catalog-v2";

const CONFIRMATION = "OWNER_ACCEPTS_UNVERIFIED_OFFICIAL_REFERENCES";
const REVIEW_ONLY_SLUGS = new Set(["roxy-migurdia", "rudeus-greyrat", "sylphiette"]);

interface ReviewCandidate {
  id: string;
  characterSlug: string;
  sourceKind: "OFFICIAL_REFERENCE";
  localPath: string;
  sourcePageUrl: string;
  sourceMediaUrl: string;
  creatorName: string;
  creatorUrl: string;
  licenseName: string | null;
  licenseUrl: string | null;
  permissionStatus: "UNVERIFIED";
  approvalStatus: string;
  sfwReview: string;
  adEligible: boolean;
  retrievedAt: string;
  sourceSha256: string;
  normalizedSha256: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  notes: string;
}

interface ReviewManifest {
  schemaVersion: number;
  generatedAt: string;
  warning: string;
  candidates: ReviewCandidate[];
}

function altText(slug: string, locale: "en" | "zh-Hant") {
  if (slug === "sasaki" || slug === "yamada-tayama") {
    return locale === "zh-Hant"
      ? "佐佐木與山田／田山出現在作品官方主視覺中。"
      : "Sasaki and Yamada / Tayama appear together in the official series key visual.";
  }
  const character = catalogCharactersV2.find((entry) => entry.slug === slug);
  if (!character) throw new Error(`Review candidate ${slug} is not in the 24-character catalog.`);
  return locale === "zh-Hant"
    ? `${character.name["zh-Hant"]}的官方來源參考圖片。`
    : `${character.name.en} official-source reference image.`;
}

async function main() {
  const confirmation = process.argv.find((argument) => argument.startsWith("--confirm="))?.slice("--confirm=".length);
  if (confirmation !== CONFIRMATION) {
    throw new Error(`Refusing to record a bulk approval. Re-run with --confirm=${CONFIRMATION}`);
  }

  const root = process.cwd();
  const reviewPath = path.join(root, "review-media", "review-manifest.json");
  const review = JSON.parse(await fs.readFile(reviewPath, "utf8")) as ReviewManifest;
  const approvedAt = new Date().toISOString();

  const entries = review.candidates.map((candidate) => {
    const reviewOnly = REVIEW_ONLY_SLUGS.has(candidate.characterSlug);
    candidate.approvalStatus = "APPROVED";
    candidate.sfwReview = "SAFE";
    candidate.adEligible = false;
    return {
      candidateId: candidate.id,
      characterSlug: candidate.characterSlug,
      sourceKind: candidate.sourceKind,
      sourcePageUrl: candidate.sourcePageUrl,
      sourceMediaUrl: candidate.sourceMediaUrl,
      creatorName: candidate.creatorName,
      creatorUrl: candidate.creatorUrl,
      licenseName: candidate.licenseName,
      licenseUrl: candidate.licenseUrl,
      permissionStatus: candidate.permissionStatus,
      approvalStatus: "APPROVED" as const,
      sfwReview: "SAFE" as const,
      adEligible: false,
      retrievedAt: candidate.retrievedAt,
      sourceSha256: candidate.sourceSha256,
      normalizedSha256: candidate.normalizedSha256,
      width: candidate.width,
      height: candidate.height,
      byteSize: candidate.byteSize,
      altText: {
        en: altText(candidate.characterSlug, "en"),
        "zh-Hant": altText(candidate.characterSlug, "zh-Hant"),
      },
      publicationDecision: reviewOnly ? "REVIEW_ONLY" as const : "PUBLISH_UNVERIFIED" as const,
      decisionReason: reviewOnly
        ? "The downloaded candidate is a shared series logo/key image rather than a clear character visual. Keep it in the review record and do not attach it as character art."
        : "The site owner approved this source-linked SFW candidate for editorial display with an unverified-permission badge, advertising disabled, and immediate takedown support.",
    };
  });

  const approvedManifest = {
    schemaVersion: 1,
    approvedAt,
    approvalBasis: "Site-owner editorial approval recorded in the project task on 2026-08-20.",
    legalNotice: "This is an editorial publication decision, not evidence of a copyright license or creator permission.",
    defaultPermissionStatus: "UNVERIFIED",
    realAdsAllowed: false,
    thirdPartyBytesCommittedToGit: false,
    entries,
  };

  await fs.writeFile(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
  await fs.writeFile(
    path.join(root, "review-media", "approval-decisions.json"),
    `${JSON.stringify({ approvedAt, confirmation: CONFIRMATION, decisions: entries.map((entry) => ({ candidateId: entry.candidateId, approvalStatus: entry.approvalStatus, sfwReview: entry.sfwReview, publicationDecision: entry.publicationDecision })) }, null, 2)}\n`,
  );
  await fs.writeFile(path.join(root, "content", "approved-media.json"), `${JSON.stringify(approvedManifest, null, 2)}\n`);

  const publishCount = entries.filter((entry) => entry.publicationDecision === "PUBLISH_UNVERIFIED").length;
  console.log(`Recorded ${entries.length} owner approvals: ${publishCount} publishable references and ${entries.length - publishCount} review-only candidates.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
