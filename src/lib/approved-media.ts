import type { Prisma } from "@prisma/client";
import { approvedMediaManifest, validateApprovedMediaManifest } from "@/data/approved-media";
import { prisma } from "@/lib/prisma";

type ApprovedMediaClient = typeof prisma;

const blockedPermissions = new Set(["REJECTED", "TAKEDOWN_REQUESTED"]);

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function assetId(candidateId: string) {
  return `owner-approved-${candidateId}`;
}

function takedownContact() {
  return process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim()).find(Boolean) ?? "wongnick.kyoaka@gmail.com";
}

export async function syncApprovedMedia(db: ApprovedMediaClient = prisma) {
  const errors = validateApprovedMediaManifest();
  if (errors.length) throw new Error(`Approved-media manifest is invalid:\n${errors.join("\n")}`);

  const configuredAdminEmails = process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean) ?? [];
  const reviewer = await db.user.findFirst({
    where: configuredAdminEmails.length ? { OR: [{ email: { in: configuredAdminEmails } }, { role: "ADMIN" }] } : { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const approvedAt = new Date(approvedMediaManifest.approvedAt);
  let published = 0;
  let reviewOnly = 0;
  let protectedFromRepublish = 0;

  for (const entry of approvedMediaManifest.entries) {
    const id = assetId(entry.candidateId);
    const existing = await db.characterAsset.findUnique({
      where: { id },
      select: { id: true, workflowStatus: true, permissionStatus: true },
    });

    if (entry.publicationDecision === "REVIEW_ONLY") {
      reviewOnly += 1;
      if (existing && existing.workflowStatus !== "PULLED") {
        await db.characterAsset.update({ where: { id }, data: { workflowStatus: "PULLED", publishedAt: null } });
      }
      continue;
    }

    if (existing && (existing.workflowStatus === "PULLED" || blockedPermissions.has(existing.permissionStatus))) {
      protectedFromRepublish += 1;
      continue;
    }

    const character = await db.character.findUnique({
      where: { slug: entry.characterSlug },
      select: { id: true, name: true, locales: { select: { locale: true, name: true } } },
    });
    if (!character) throw new Error(`Cannot sync approved media: character ${entry.characterSlug} does not exist.`);
    const englishName = character.locales.find((locale) => locale.locale === "EN")?.name ?? character.name;
    const chineseName = character.locales.find((locale) => locale.locale === "ZH_HANT")?.name ?? character.name;

    const metadata = jsonValue({
      reviewCandidateId: entry.candidateId,
      ownerApproval: {
        approvedAt: approvedMediaManifest.approvedAt,
        basis: approvedMediaManifest.approvalBasis,
        copyrightLicenseAsserted: false,
      },
      sourceSha256: entry.sourceSha256,
      normalizedReviewSha256: entry.normalizedSha256,
      reviewedDimensions: { width: entry.width, height: entry.height },
      reviewedByteSize: entry.byteSize,
      directRemoteReference: true,
      localReviewCopyIgnoredByGit: true,
      adEligible: false,
    });
    const common = {
      characterId: character.id,
      kind: "HERO" as const,
      label: `${englishName} source-linked character visual`,
      storageKey: `remote-reference/${entry.characterSlug}/${entry.normalizedSha256.slice(0, 16)}`,
      altText: entry.altText.en,
      workflowStatus: "PUBLISHED" as const,
      publishedAt: approvedAt,
      metadata,
      sourceKind: "OFFICIAL_REFERENCE" as const,
      sourceUrl: entry.sourcePageUrl,
      attributionText: `Source-linked official reference. Copyright remains with ${entry.creatorName}.`,
      takedownContact: takedownContact(),
      sourceLabel: "Official source link · permission unverified",
      licenseName: entry.licenseName ?? "No reuse license recorded",
      publicUrl: entry.sourceMediaUrl,
      permissionStatus: "UNVERIFIED" as const,
      contentRating: "SFW" as const,
      creatorName: entry.creatorName,
      creatorUrl: entry.creatorUrl,
      originalMediaUrl: entry.sourceMediaUrl,
      licenseUrl: entry.licenseUrl,
      permissionEvidence: "Site-owner editorial approval only; no creator permission evidence is recorded.",
      commercialUseAllowed: false,
      adaptationAllowed: false,
      retrievedAt: new Date(entry.retrievedAt),
      reviewedById: reviewer?.id,
      reviewedAt: approvedAt,
      reviewNotes: entry.decisionReason,
      riskAcknowledgedById: reviewer?.id,
      riskAcknowledgedAt: approvedAt,
      primaryPriority: Math.max(200, 300 - (entry.displayOrder ?? 0)),
    };

    await db.characterAsset.upsert({
      where: { id },
      create: { id, ...common },
      update: {
        ...common,
        // Do not downgrade permission if an administrator later records a verified grant.
        permissionStatus: existing?.permissionStatus === "UNVERIFIED" ? "UNVERIFIED" : undefined,
      },
    });

    for (const [locale, altText, caption] of [
      ["EN", entry.altText.en, `${englishName} official source reference`],
      ["ZH_HANT", entry.altText["zh-Hant"], `${chineseName}官方來源參考`],
    ] as const) {
      await db.characterAssetLocale.upsert({
        where: { assetId_locale: { assetId: id, locale } },
        create: { assetId: id, locale, altText, caption, attributionText: `${entry.creatorName} · ${entry.sourcePageUrl}` },
        update: { altText, caption, attributionText: `${entry.creatorName} · ${entry.sourcePageUrl}` },
      });
    }

    await db.assetAuditLog.upsert({
      where: { id: `${id}-owner-approval` },
      create: {
        id: `${id}-owner-approval`,
        assetId: id,
        actorUserId: reviewer?.id,
        action: "PUBLISHED",
        detail: jsonValue({ approvalBasis: approvedMediaManifest.approvalBasis, permissionStatus: "UNVERIFIED", realAdsAllowed: false }),
        createdAt: approvedAt,
      },
      update: {},
    });
    published += 1;
  }

  return { approved: approvedMediaManifest.entries.length, published, reviewOnly, protectedFromRepublish };
}
