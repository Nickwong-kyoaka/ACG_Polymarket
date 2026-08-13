import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type StoreLocale = "en" | "zh-Hant";
type Tx = Prisma.TransactionClient;

function localeCode(locale: StoreLocale) {
  return locale === "zh-Hant" ? "ZH_HANT" : "EN";
}

function badgeLevel(units: number) {
  if (units >= 100) return 4;
  if (units >= 50) return 3;
  if (units >= 25) return 2;
  if (units >= 10) return 1;
  return 0;
}

const campaignInclude = {
  locales: true,
  rewards: { orderBy: { thresholdUnits: "asc" as const } },
  character: {
    include: {
      locales: true,
      assets: {
        where: {
          workflowStatus: "PUBLISHED" as const,
          contentRating: "SFW" as const,
          permissionStatus: { notIn: ["REJECTED", "TAKEDOWN_REQUESTED"] as const },
        },
        include: { locales: true, derivatives: true },
        orderBy: [{ primaryPriority: "desc" as const }, { publishedAt: "desc" as const }],
        take: 1,
      },
    },
  },
} satisfies Prisma.SupportCampaignInclude;

type CampaignRecord = Prisma.SupportCampaignGetPayload<{ include: typeof campaignInclude }>;

function publicCampaign(record: CampaignRecord, locale: StoreLocale, contribution?: {
  units: number;
  badgeLevel: number;
}) {
  const localized = record.locales.find((entry) => entry.locale === localeCode(locale));
  const characterLocale = record.character.locales.find(
    (entry) => entry.locale === localeCode(locale),
  );
  const asset = record.character.assets[0];
  const assetLocale = asset?.locales.find((entry) => entry.locale === localeCode(locale));

  return {
    id: record.id,
    slug: record.slug,
    status: record.status,
    title: localized?.title ?? record.title,
    description: localized?.description ?? record.description,
    goalUnits: record.goalUnits,
    currentUnits: record.currentUnits,
    progressPercent: Math.min(100, Math.round((record.currentUnits / record.goalUnits) * 100)),
    startsAt: record.startsAt.toISOString(),
    endsAt: record.endsAt?.toISOString() ?? null,
    character: {
      id: record.character.id,
      slug: record.character.slug,
      name: characterLocale?.name ?? record.character.name,
      title: characterLocale?.title ?? record.character.title,
      accentFrom: record.character.accentFrom,
      accentTo: record.character.accentTo,
      primaryImage: asset
        ? {
            url: asset.publicUrl ?? asset.storageKey,
            altText: assetLocale?.altText ?? asset.altText,
            sourceLabel: asset.sourceLabel ?? null,
            creatorName: asset.creatorName ?? null,
            creatorUrl: asset.creatorUrl ?? null,
            licenseUrl: asset.licenseUrl ?? null,
            permissionStatus: asset.permissionStatus,
          }
        : null,
    },
    rewards: record.rewards.map((reward) => ({
      id: reward.id,
      thresholdUnits: reward.thresholdUnits,
      kind: reward.kind,
      label: reward.label,
      referenceId: reward.referenceId,
      unlocked: record.currentUnits >= reward.thresholdUnits,
    })),
    viewerContribution: contribution ?? null,
  };
}

export async function listSupportCampaigns(input: {
  locale?: StoreLocale;
  userId?: string;
  characterId?: string;
  includeCompleted?: boolean;
  now?: Date;
} = {}) {
  const locale = input.locale ?? "en";
  const now = input.now ?? new Date();
  const campaigns = await prisma.supportCampaign.findMany({
    where: {
      ...(input.characterId ? { characterId: input.characterId } : {}),
      status: input.includeCompleted ? { in: ["ACTIVE", "COMPLETED"] } : "ACTIVE",
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }, { status: "COMPLETED" }],
    },
    include: campaignInclude,
    orderBy: [{ status: "asc" }, { startsAt: "desc" }],
  });
  const contributions = input.userId
    ? await prisma.campaignContribution.findMany({
        where: { userId: input.userId, campaignId: { in: campaigns.map((entry) => entry.id) } },
      })
    : [];
  const contributionByCampaign = new Map(
    contributions.map((entry) => [entry.campaignId, { units: entry.units, badgeLevel: entry.badgeLevel }]),
  );

  return campaigns.map((campaign) =>
    publicCampaign(campaign, locale, contributionByCampaign.get(campaign.id)),
  );
}

export async function getSupportCampaign(
  slug: string,
  locale: StoreLocale = "en",
  userId?: string,
) {
  const campaign = await prisma.supportCampaign.findUnique({
    where: { slug },
    include: campaignInclude,
  });
  if (!campaign || campaign.status === "DRAFT" || campaign.status === "ARCHIVED") {
    throw new AppError("Support campaign not found.", 404, "CAMPAIGN_NOT_FOUND");
  }
  const contribution = userId
    ? await prisma.campaignContribution.findUnique({
        where: { campaignId_userId: { campaignId: campaign.id, userId } },
      })
    : null;

  return publicCampaign(
    campaign,
    locale,
    contribution ? { units: contribution.units, badgeLevel: contribution.badgeLevel } : undefined,
  );
}

export async function advanceSupportCampaigns(
  tx: Tx,
  input: { userId: string; characterId: string; quantity: number; now?: Date },
) {
  const now = input.now ?? new Date();
  const campaigns = await tx.supportCampaign.findMany({
    where: {
      characterId: input.characterId,
      status: "ACTIVE",
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    include: { rewards: { orderBy: { thresholdUnits: "asc" } } },
  });
  const results: Array<{
    campaignId: string;
    slug: string;
    currentUnits: number;
    goalUnits: number;
    reachedThresholds: number[];
  }> = [];

  for (const campaign of campaigns) {
    const acceptedUnits = Math.min(input.quantity, campaign.goalUnits - campaign.currentUnits);
    if (acceptedUnits <= 0) continue;

    const existing = await tx.campaignContribution.findUnique({
      where: { campaignId_userId: { campaignId: campaign.id, userId: input.userId } },
    });
    const nextContribution = (existing?.units ?? 0) + acceptedUnits;
    const nextCurrent = campaign.currentUnits + acceptedUnits;
    const reached = campaign.rewards.filter(
      (reward) =>
        reward.thresholdUnits > campaign.currentUnits && reward.thresholdUnits <= nextCurrent,
    );

    const updated = await tx.supportCampaign.updateMany({
      where: { id: campaign.id, currentUnits: campaign.currentUnits, status: "ACTIVE" },
      data: {
        currentUnits: nextCurrent,
        status: nextCurrent >= campaign.goalUnits ? "COMPLETED" : "ACTIVE",
      },
    });
    if (updated.count !== 1) {
      throw new AppError("Campaign progress changed. Retry the trade.", 409, "CAMPAIGN_CHANGED");
    }

    await tx.campaignContribution.upsert({
      where: { campaignId_userId: { campaignId: campaign.id, userId: input.userId } },
      create: {
        campaignId: campaign.id,
        userId: input.userId,
        units: acceptedUnits,
        badgeLevel: badgeLevel(acceptedUnits),
        lastContributedAt: now,
      },
      update: {
        units: nextContribution,
        badgeLevel: badgeLevel(nextContribution),
        lastContributedAt: now,
      },
    });

    const unlockedShopRewards = campaign.rewards.filter(
      (reward) =>
        reward.kind === "SHOP_ITEM" &&
        reward.referenceId &&
        reward.thresholdUnits <= nextCurrent,
    );
    for (const reward of unlockedShopRewards) {
      const item = await tx.shopItem.findFirst({
        where: {
          published: true,
          OR: [{ id: reward.referenceId! }, { slug: reward.referenceId! }],
        },
        select: { id: true },
      });
      if (item) {
        await tx.inventoryItem.upsert({
          where: { userId_shopItemId: { userId: input.userId, shopItemId: item.id } },
          create: { userId: input.userId, shopItemId: item.id },
          update: {},
        });
      }
    }

    if (reached.length > 0 || nextCurrent >= campaign.goalUnits) {
      await tx.notification.create({
        data: {
          userId: input.userId,
          type: "SYSTEM",
          title: nextCurrent >= campaign.goalUnits ? "Support goal completed" : "Support milestone reached",
          body:
            reached.length > 0
              ? `${campaign.title} unlocked ${reached.map((entry) => entry.label).join(", ")}.`
              : `${campaign.title} reached its shared support goal.`,
        },
      });
    }

    results.push({
      campaignId: campaign.id,
      slug: campaign.slug,
      currentUnits: nextCurrent,
      goalUnits: campaign.goalUnits,
      reachedThresholds: reached.map((entry) => entry.thresholdUnits),
    });
  }

  return results;
}
