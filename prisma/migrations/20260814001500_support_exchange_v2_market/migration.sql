-- CreateEnum
CREATE TYPE "AssetPermissionStatus" AS ENUM ('VERIFIED', 'CREATOR_GRANTED', 'UNVERIFIED', 'REJECTED', 'TAKEDOWN_REQUESTED');

-- CreateEnum
CREATE TYPE "ContentRating" AS ENUM ('UNRATED', 'SFW', 'SUGGESTIVE', 'NSFW');

-- CreateEnum
CREATE TYPE "AssetDerivativeKind" AS ENUM ('THUMBNAIL', 'CARD', 'HERO', 'WALLPAPER');

-- CreateEnum
CREATE TYPE "AssetAuditAction" AS ENUM ('CREATED', 'METADATA_UPDATED', 'RIGHTS_REVIEWED', 'PUBLISHED', 'PULLED', 'TAKEDOWN_REQUESTED', 'TAKEDOWN_RESOLVED');

-- CreateEnum
CREATE TYPE "TakedownStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CampaignRewardKind" AS ENUM ('BADGE', 'SHOP_ITEM', 'COMFORT_CONTENT');

-- CreateEnum
CREATE TYPE "MarketAlertKind" AS ENUM ('QUOTE_ABOVE', 'QUOTE_BELOW', 'CAMPAIGN_MILESTONE', 'SUPPORT_ACTIVITY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssetSourceKind" ADD VALUE 'PLATFORM_ORIGINAL';
ALTER TYPE "AssetSourceKind" ADD VALUE 'FAN_ART';
ALTER TYPE "AssetSourceKind" ADD VALUE 'OPEN_LICENSE';

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "marketVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CharacterAsset" ADD COLUMN     "adaptationAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "commercialUseAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contentRating" "ContentRating" NOT NULL DEFAULT 'UNRATED',
ADD COLUMN     "creatorName" TEXT,
ADD COLUMN     "creatorUrl" TEXT,
ADD COLUMN     "licenseUrl" TEXT,
ADD COLUMN     "originalMediaUrl" TEXT,
ADD COLUMN     "permissionEvidence" TEXT,
ADD COLUMN     "permissionStatus" "AssetPermissionStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "primaryPriority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "retrievedAt" TIMESTAMP(3),
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "riskAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "riskAcknowledgedById" TEXT;

-- Existing published demo assets are known SFW; provenance remains UNVERIFIED until reviewed.
UPDATE "CharacterAsset"
SET "contentRating" = 'SFW'
WHERE "workflowStatus" = 'PUBLISHED';

-- AlterTable
ALTER TABLE "Trade"
ADD COLUMN "averageUnitPrice" INTEGER,
ADD COLUMN "firstUnitPrice" INTEGER,
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "lastUnitPrice" INTEGER,
ADD COLUMN "marketVersion" INTEGER,
ADD COLUMN "quoteAfter" INTEGER,
ADD COLUMN "quoteBefore" INTEGER,
ADD COLUMN "supplyAfter" INTEGER,
ADD COLUMN "supplyBefore" INTEGER;

ALTER TABLE "Trade"
ALTER COLUMN "side" TYPE "TradeSide"
USING "side"::"TradeSide";

-- Backfill legacy beta trades before enforcing the V2 execution contract.
UPDATE "Trade"
SET
  "averageUnitPrice" = GREATEST(1, ROUND("totalCost"::numeric / GREATEST("quantity", 1))::integer),
  "firstUnitPrice" = "unitPrice",
  "lastUnitPrice" = "unitPrice",
  "idempotencyKey" = 'legacy-' || "id",
  "marketVersion" = 0,
  "quoteBefore" = "unitPrice",
  "quoteAfter" = "unitPrice",
  "supplyBefore" = CASE WHEN "side" = 'BUY' THEN 0 ELSE "quantity" END,
  "supplyAfter" = CASE WHEN "side" = 'BUY' THEN "quantity" ELSE 0 END;

ALTER TABLE "Trade"
ALTER COLUMN "averageUnitPrice" SET NOT NULL,
ALTER COLUMN "firstUnitPrice" SET NOT NULL,
ALTER COLUMN "idempotencyKey" SET NOT NULL,
ALTER COLUMN "lastUnitPrice" SET NOT NULL,
ALTER COLUMN "marketVersion" SET NOT NULL,
ALTER COLUMN "quoteAfter" SET NOT NULL,
ALTER COLUMN "quoteBefore" SET NOT NULL,
ALTER COLUMN "supplyAfter" SET NOT NULL,
ALTER COLUMN "supplyBefore" SET NOT NULL;

-- CreateTable
CREATE TABLE "AssetDerivative" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "kind" "AssetDerivativeKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetDerivative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterAssetLocale" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "altText" TEXT NOT NULL,
    "caption" TEXT,
    "attributionText" TEXT,

    CONSTRAINT "CharacterAssetLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAuditLog" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AssetAuditAction" NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TakedownRequest" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "requesterUserId" TEXT,
    "requesterName" TEXT,
    "requesterEmail" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "status" "TakedownStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TakedownRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportCampaign" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "goalUnits" INTEGER NOT NULL,
    "currentUnits" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportCampaignLocale" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "SupportCampaignLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignContribution" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 0,
    "badgeLevel" INTEGER NOT NULL DEFAULT 0,
    "lastContributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportCampaignReward" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "thresholdUnits" INTEGER NOT NULL,
    "kind" "CampaignRewardKind" NOT NULL,
    "label" TEXT NOT NULL,
    "referenceId" TEXT,

    CONSTRAINT "SupportCampaignReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "kind" "MarketAlertKind" NOT NULL,
    "thresholdValue" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketAlert_pkey" PRIMARY KEY ("id")
);

-- Database-level economy and market invariants backstop application transactions.
ALTER TABLE "Wallet"
ADD CONSTRAINT "Wallet_nonnegative_balances_check"
CHECK ("softBalance" >= 0 AND "premiumBalance" >= 0);

ALTER TABLE "SupportPosition"
ADD CONSTRAINT "SupportPosition_nonnegative_values_check"
CHECK ("units" >= 0 AND "averageCost" >= 0);

ALTER TABLE "Character"
ADD CONSTRAINT "Character_market_values_check"
CHECK (
  "basePrice" > 0 AND "priceStep" > 0 AND "unitsPerStep" > 0 AND
  "circulatingUnits" >= 0 AND "supporterCount" >= 0 AND "marketVersion" >= 0
);

ALTER TABLE "Trade"
ADD CONSTRAINT "Trade_execution_values_check"
CHECK (
  "quantity" > 0 AND "totalCost" > 0 AND "unitPrice" > 0 AND
  "quoteBefore" > 0 AND "quoteAfter" > 0 AND
  "supplyBefore" >= 0 AND "supplyAfter" >= 0 AND
  "firstUnitPrice" > 0 AND "lastUnitPrice" > 0 AND
  "averageUnitPrice" > 0 AND "marketVersion" >= 0
);

ALTER TABLE "CharacterAsset"
ADD CONSTRAINT "CharacterAsset_media_values_check"
CHECK (("byteSize" IS NULL OR "byteSize" > 0) AND "primaryPriority" >= 0);

ALTER TABLE "AssetDerivative"
ADD CONSTRAINT "AssetDerivative_dimensions_check"
CHECK ("width" > 0 AND "height" > 0 AND "byteSize" > 0);

ALTER TABLE "SupportCampaign"
ADD CONSTRAINT "SupportCampaign_progress_check"
CHECK (
  "goalUnits" > 0 AND "currentUnits" >= 0 AND "currentUnits" <= "goalUnits" AND
  ("endsAt" IS NULL OR "endsAt" > "startsAt")
);

ALTER TABLE "CampaignContribution"
ADD CONSTRAINT "CampaignContribution_values_check"
CHECK ("units" >= 0 AND "badgeLevel" >= 0);

ALTER TABLE "SupportCampaignReward"
ADD CONSTRAINT "SupportCampaignReward_threshold_check"
CHECK ("thresholdUnits" > 0);

ALTER TABLE "MarketAlert"
ADD CONSTRAINT "MarketAlert_threshold_check"
CHECK (
  ("kind" = 'SUPPORT_ACTIVITY' AND "thresholdValue" IS NULL) OR
  ("kind" <> 'SUPPORT_ACTIVITY' AND "thresholdValue" IS NOT NULL AND "thresholdValue" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetDerivative_checksum_key" ON "AssetDerivative"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "AssetDerivative_assetId_kind_key" ON "AssetDerivative"("assetId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterAssetLocale_assetId_locale_key" ON "CharacterAssetLocale"("assetId", "locale");

-- CreateIndex
CREATE INDEX "AssetAuditLog_assetId_createdAt_idx" ON "AssetAuditLog"("assetId", "createdAt");

-- CreateIndex
CREATE INDEX "TakedownRequest_assetId_status_idx" ON "TakedownRequest"("assetId", "status");

-- CreateIndex
CREATE INDEX "TakedownRequest_status_createdAt_idx" ON "TakedownRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportCampaign_slug_key" ON "SupportCampaign"("slug");

-- CreateIndex
CREATE INDEX "SupportCampaign_status_startsAt_endsAt_idx" ON "SupportCampaign"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "SupportCampaign_characterId_status_idx" ON "SupportCampaign"("characterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SupportCampaignLocale_campaignId_locale_key" ON "SupportCampaignLocale"("campaignId", "locale");

-- CreateIndex
CREATE INDEX "CampaignContribution_userId_lastContributedAt_idx" ON "CampaignContribution"("userId", "lastContributedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignContribution_campaignId_userId_key" ON "CampaignContribution"("campaignId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportCampaignReward_campaignId_thresholdUnits_kind_key" ON "SupportCampaignReward"("campaignId", "thresholdUnits", "kind");

-- CreateIndex
CREATE INDEX "MarketAlert_characterId_active_kind_idx" ON "MarketAlert"("characterId", "active", "kind");

-- CreateIndex
CREATE INDEX "MarketAlert_userId_active_idx" ON "MarketAlert"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "MarketAlert_userId_characterId_kind_thresholdValue_key" ON "MarketAlert"("userId", "characterId", "kind", "thresholdValue");

-- PostgreSQL treats NULL values as distinct in ordinary unique indexes.
CREATE UNIQUE INDEX "MarketAlert_support_activity_user_character_key"
ON "MarketAlert"("userId", "characterId")
WHERE "kind" = 'SUPPORT_ACTIVITY' AND "thresholdValue" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CharacterAsset_checksum_key" ON "CharacterAsset"("checksum");

-- CreateIndex
CREATE INDEX "CharacterAsset_characterId_workflowStatus_primaryPriority_idx" ON "CharacterAsset"("characterId", "workflowStatus", "primaryPriority");

-- CreateIndex
CREATE INDEX "CharacterAsset_permissionStatus_contentRating_idx" ON "CharacterAsset"("permissionStatus", "contentRating");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_idempotencyKey_key" ON "Trade"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Trade_characterId_createdAt_idx" ON "Trade"("characterId", "createdAt");

-- CreateIndex
CREATE INDEX "Trade_characterId_side_createdAt_idx" ON "Trade"("characterId", "side", "createdAt");

-- AddForeignKey
ALTER TABLE "AssetDerivative" ADD CONSTRAINT "AssetDerivative_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CharacterAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAssetLocale" ADD CONSTRAINT "CharacterAssetLocale_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CharacterAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAuditLog" ADD CONSTRAINT "AssetAuditLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CharacterAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAuditLog" ADD CONSTRAINT "AssetAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakedownRequest" ADD CONSTRAINT "TakedownRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CharacterAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakedownRequest" ADD CONSTRAINT "TakedownRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCampaign" ADD CONSTRAINT "SupportCampaign_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCampaignLocale" ADD CONSTRAINT "SupportCampaignLocale_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SupportCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignContribution" ADD CONSTRAINT "CampaignContribution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SupportCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignContribution" ADD CONSTRAINT "CampaignContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCampaignReward" ADD CONSTRAINT "SupportCampaignReward_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SupportCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketAlert" ADD CONSTRAINT "MarketAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketAlert" ADD CONSTRAINT "MarketAlert_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
