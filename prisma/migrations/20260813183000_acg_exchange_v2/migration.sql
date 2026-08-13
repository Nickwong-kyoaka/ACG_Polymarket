-- CreateEnum
CREATE TYPE "LocaleCode" AS ENUM ('EN', 'ZH_HANT');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'RIGHTS_CHECKED', 'REVIEWED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('VISIBLE', 'HELD', 'REMOVED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "MissionKey" AS ENUM ('COMFORT_SESSION', 'POSITIVE_REACTION', 'SUPPORT_OR_WATCH');

-- CreateEnum
CREATE TYPE "WorkKind" AS ENUM ('SHIFT_30M', 'SHIFT_2H', 'SHIFT_6H');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('ACTIVE', 'READY', 'CLAIMED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssetKind" ADD VALUE 'VOICE';
ALTER TYPE "AssetKind" ADD VALUE 'ASMR';
ALTER TYPE "AssetKind" ADD VALUE 'COMIC';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LedgerReferenceType" ADD VALUE 'MISSION_REWARD';
ALTER TYPE "LedgerReferenceType" ADD VALUE 'WORK_REWARD';

-- AlterTable
ALTER TABLE "AdRewardClaim" ADD COLUMN     "proofId" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'mock',
ADD COLUMN     "slot" INTEGER;

WITH ranked_claims AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "userId", "dayKey" ORDER BY "claimedAt", "id") AS slot_number
  FROM "AdRewardClaim"
)
UPDATE "AdRewardClaim"
SET "slot" = ranked_claims.slot_number
FROM ranked_claims
WHERE "AdRewardClaim"."id" = ranked_claims."id";

ALTER TABLE "AdRewardClaim" ALTER COLUMN "slot" SET NOT NULL,
ALTER COLUMN "slot" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "publishStatus" "PublishStatus" NOT NULL DEFAULT 'DRAFT';

UPDATE "Character" SET "publishStatus" = 'PUBLISHED';

-- AlterTable
ALTER TABLE "CharacterAsset" ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiPrompt" TEXT,
ADD COLUMN     "byteSize" INTEGER,
ADD COLUMN     "licenseName" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "publicUrl" TEXT,
ADD COLUMN     "sourceLabel" TEXT;

-- AlterTable
ALTER TABLE "ComfortContent" ADD COLUMN     "assetId" TEXT;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "status" "CommentStatus" NOT NULL DEFAULT 'VISIBLE',
ADD COLUMN     "updatedAt" TIMESTAMP(3);

UPDATE "Comment" SET "updatedAt" = "createdAt";

ALTER TABLE "Comment" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "resolution" TEXT,
ADD COLUMN     "status" "ReportStatus" NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "SeriesLocale" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,

    CONSTRAINT "SeriesLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterLocale" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "fandomPrompt" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "favoritePhrase" TEXT,

    CONSTRAINT "CharacterLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeDefinitionLocale" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "AttributeDefinitionLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopItemLocale" (
    "id" TEXT NOT NULL,
    "shopItemId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "previewLabel" TEXT NOT NULL,

    CONSTRAINT "ShopItemLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComfortModeLocale" (
    "id" TEXT NOT NULL,
    "modeId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "promptLabel" TEXT NOT NULL,

    CONSTRAINT "ComfortModeLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComfortContentLocale" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "ComfortContentLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComicPanel" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" TEXT NOT NULL,

    CONSTRAINT "ComicPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComicPanelLocale" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "caption" TEXT NOT NULL,

    CONSTRAINT "ComicPanelLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "response" JSONB,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMissionProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "missionKey" "MissionKey" NOT NULL,
    "reward" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMissionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkShift" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT,
    "dayKey" TEXT NOT NULL,
    "kind" "WorkKind" NOT NULL,
    "status" "WorkStatus" NOT NULL DEFAULT 'ACTIVE',
    "reward" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "WorkShift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeriesLocale_seriesId_locale_key" ON "SeriesLocale"("seriesId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterLocale_characterId_locale_key" ON "CharacterLocale"("characterId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeDefinitionLocale_definitionId_locale_key" ON "AttributeDefinitionLocale"("definitionId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ShopItemLocale_shopItemId_locale_key" ON "ShopItemLocale"("shopItemId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ComfortModeLocale_modeId_locale_key" ON "ComfortModeLocale"("modeId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ComfortContentLocale_contentId_locale_key" ON "ComfortContentLocale"("contentId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ComicPanel_contentId_sortOrder_key" ON "ComicPanel"("contentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ComicPanelLocale_panelId_locale_key" ON "ComicPanelLocale"("panelId", "locale");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_userId_scope_key_key" ON "IdempotencyRecord"("userId", "scope", "key");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMissionProgress_userId_dayKey_missionKey_key" ON "DailyMissionProgress"("userId", "dayKey", "missionKey");

-- CreateIndex
CREATE INDEX "WorkShift_userId_dayKey_idx" ON "WorkShift"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "WorkShift_userId_status_idx" ON "WorkShift"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AdRewardClaim_userId_dayKey_slot_key" ON "AdRewardClaim"("userId", "dayKey", "slot");

-- AddForeignKey
ALTER TABLE "SeriesLocale" ADD CONSTRAINT "SeriesLocale_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterLocale" ADD CONSTRAINT "CharacterLocale_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeDefinitionLocale" ADD CONSTRAINT "AttributeDefinitionLocale_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "AttributeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopItemLocale" ADD CONSTRAINT "ShopItemLocale_shopItemId_fkey" FOREIGN KEY ("shopItemId") REFERENCES "ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComfortModeLocale" ADD CONSTRAINT "ComfortModeLocale_modeId_fkey" FOREIGN KEY ("modeId") REFERENCES "ComfortMode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComfortContent" ADD CONSTRAINT "ComfortContent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CharacterAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComfortContentLocale" ADD CONSTRAINT "ComfortContentLocale_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ComfortContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicPanel" ADD CONSTRAINT "ComicPanel_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ComfortContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicPanelLocale" ADD CONSTRAINT "ComicPanelLocale_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "ComicPanel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMissionProgress" ADD CONSTRAINT "DailyMissionProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkShift" ADD CONSTRAINT "WorkShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkShift" ADD CONSTRAINT "WorkShift_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
