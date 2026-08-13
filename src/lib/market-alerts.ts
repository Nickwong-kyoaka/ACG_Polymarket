import type { MarketAlertKind, Prisma, TradeSide } from "@prisma/client";
import { AppError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

function validateThreshold(kind: MarketAlertKind, thresholdValue?: number | null) {
  if (kind === "SUPPORT_ACTIVITY") {
    if (thresholdValue != null) {
      throw new AppError("Support activity alerts do not use a threshold.", 422, "INVALID_ALERT");
    }
    return null;
  }
  if (!Number.isInteger(thresholdValue) || (thresholdValue ?? 0) <= 0) {
    throw new AppError("This alert requires a positive integer threshold.", 422, "INVALID_ALERT");
  }
  return thresholdValue as number;
}

function alertDto(alert: {
  id: string;
  characterId: string;
  kind: MarketAlertKind;
  thresholdValue: number | null;
  active: boolean;
  lastTriggeredAt: Date | null;
  createdAt: Date;
  character: { slug: string; name: string };
}) {
  return {
    id: alert.id,
    characterId: alert.characterId,
    characterSlug: alert.character.slug,
    characterName: alert.character.name,
    kind: alert.kind,
    thresholdValue: alert.thresholdValue,
    active: alert.active,
    lastTriggeredAt: alert.lastTriggeredAt?.toISOString() ?? null,
    createdAt: alert.createdAt.toISOString(),
  };
}

export async function listMarketAlerts(userId: string) {
  const alerts = await prisma.marketAlert.findMany({
    where: { userId },
    include: { character: { select: { slug: true, name: true } } },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });
  return alerts.map(alertDto);
}

export async function createMarketAlert(input: {
  userId: string;
  characterId: string;
  kind: MarketAlertKind;
  thresholdValue?: number | null;
}) {
  const thresholdValue = validateThreshold(input.kind, input.thresholdValue);
  const character = await prisma.character.findFirst({
    where: {
      publishStatus: "PUBLISHED",
      OR: [{ id: input.characterId }, { slug: input.characterId }],
    },
    select: { id: true },
  });
  if (!character) {
    throw new AppError("Character not found.", 404, "CHARACTER_NOT_FOUND");
  }

  const existing = await prisma.marketAlert.findFirst({
    where: {
      userId: input.userId,
      characterId: character.id,
      kind: input.kind,
      thresholdValue,
    },
  });
  const alert = existing
    ? await prisma.marketAlert.update({
        where: { id: existing.id },
        data: { active: true, lastTriggeredAt: null },
        include: { character: { select: { slug: true, name: true } } },
      })
    : await prisma.marketAlert.create({
        data: {
          userId: input.userId,
          characterId: character.id,
          kind: input.kind,
          thresholdValue,
        },
        include: { character: { select: { slug: true, name: true } } },
      });
  return alertDto(alert);
}

export async function deleteMarketAlert(userId: string, alertId: string) {
  const result = await prisma.marketAlert.deleteMany({ where: { id: alertId, userId } });
  if (result.count !== 1) {
    throw new AppError("Market alert not found.", 404, "ALERT_NOT_FOUND");
  }
  return { deleted: true, id: alertId };
}

export async function triggerMarketAlerts(
  tx: Tx,
  input: {
    characterId: string;
    characterName: string;
    side: TradeSide;
    quoteAfter: number;
    campaignProgress: Array<{ currentUnits: number }>;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  const campaignUnits = input.campaignProgress.reduce(
    (highest, campaign) => Math.max(highest, campaign.currentUnits),
    0,
  );
  const alerts = await tx.marketAlert.findMany({
    where: { characterId: input.characterId, active: true },
  });
  const triggered = alerts.filter((alert) => {
    switch (alert.kind) {
      case "QUOTE_ABOVE":
        return input.quoteAfter >= (alert.thresholdValue ?? Number.POSITIVE_INFINITY);
      case "QUOTE_BELOW":
        return input.quoteAfter <= (alert.thresholdValue ?? Number.NEGATIVE_INFINITY);
      case "CAMPAIGN_MILESTONE":
        return campaignUnits >= (alert.thresholdValue ?? Number.POSITIVE_INFINITY);
      case "SUPPORT_ACTIVITY":
        return input.side === "BUY";
    }
  });

  for (const alert of triggered) {
    const updated = await tx.marketAlert.updateMany({
      where: { id: alert.id, active: true },
      data: { active: false, lastTriggeredAt: now },
    });
    if (updated.count === 0) continue;
    await tx.notification.create({
      data: {
        userId: alert.userId,
        type: "TRADE",
        title: `${input.characterName} support signal`,
        body:
          alert.kind === "CAMPAIGN_MILESTONE"
            ? `The shared campaign reached ${alert.thresholdValue} support units.`
            : alert.kind === "SUPPORT_ACTIVITY"
              ? "A new positive support trade arrived."
              : `The current support quote is ${input.quoteAfter} SUP.`,
      },
    });
  }

  return triggered.map((alert) => alert.id);
}
