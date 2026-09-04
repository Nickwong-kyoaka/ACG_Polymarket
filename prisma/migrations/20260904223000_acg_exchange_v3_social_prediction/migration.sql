-- CreateEnum
CREATE TYPE "PostKind" AS ENUM ('NOTE', 'OUTFIT', 'COMIC', 'VOICE', 'GUIDE', 'PREDICTION_TAKE');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'HELD', 'REMOVED');

-- CreateEnum
CREATE TYPE "PostMediaStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PULLED');

-- CreateEnum
CREATE TYPE "CreatorStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "LibraryStatus" AS ENUM ('WANT', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED');

-- CreateEnum
CREATE TYPE "EpisodeProgressStatus" AS ENUM ('PLANNED', 'WATCHED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('SERIES', 'CHARACTER', 'PERSON', 'EPISODE', 'POST');

-- CreateEnum
CREATE TYPE "EditProposalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewDecisionKind" AS ENUM ('REQUEST_CHANGES', 'APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "ContributorTrustKind" AS ENUM ('PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'REVISION_REVERTED', 'SOURCE_VERIFIED', 'MODERATION_ACTION');

-- CreateEnum
CREATE TYPE "PredictionMarketStatus" AS ENUM ('DRAFT', 'OPEN', 'LOCKED', 'PROPOSED', 'CHALLENGE', 'RESOLVED', 'VOID');

-- CreateEnum
CREATE TYPE "PredictionTradeSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "PredictionResolutionStatus" AS ENUM ('PROPOSED', 'CHALLENGED', 'CONFIRMED', 'VOIDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LedgerReferenceType" ADD VALUE 'PREDICTION_BUY';
ALTER TYPE "LedgerReferenceType" ADD VALUE 'PREDICTION_SELL';
ALTER TYPE "LedgerReferenceType" ADD VALUE 'PREDICTION_FEE';
ALTER TYPE "LedgerReferenceType" ADD VALUE 'PREDICTION_PAYOUT';
ALTER TYPE "LedgerReferenceType" ADD VALUE 'PREDICTION_REFUND';

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "heartedByAuthor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "pinnedByAuthor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "postId" TEXT,
ADD COLUMN     "predictionMarketId" TEXT,
ALTER COLUMN "characterId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "href" TEXT,
ADD COLUMN     "locale" "LocaleCode",
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "preferredLocale" "LocaleCode" NOT NULL DEFAULT 'EN';

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "postId" TEXT;

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "language" "LocaleCode" NOT NULL,
    "kind" "PostKind" NOT NULL DEFAULT 'NOTE',
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "primaryCharacterId" TEXT,
    "seriesId" TEXT,
    "creatorSeriesId" TEXT,
    "sourceUrl" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostMedia" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "assetId" TEXT,
    "publicUrl" TEXT,
    "storageKey" TEXT,
    "sourceUrl" TEXT,
    "sourceLabel" TEXT,
    "altText" TEXT NOT NULL,
    "status" "PostMediaStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "PostMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicLocale" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "TopicLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTopic" (
    "postId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "PostTopic_pkey" PRIMARY KEY ("postId","topicId")
);

-- CreateTable
CREATE TABLE "PostSave" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSave_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "PostReaction" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostReaction_pkey" PRIMARY KEY ("userId","postId","kind")
);

-- CreateTable
CREATE TABLE "UserFollow" (
    "followerId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("followerId","targetId")
);

-- CreateTable
CREATE TABLE "CharacterFollow" (
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterFollow_pkey" PRIMARY KEY ("userId","characterId")
);

-- CreateTable
CREATE TABLE "TopicFollow" (
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicFollow_pkey" PRIMARY KEY ("userId","topicId")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "postId" TEXT,
    "characterId" TEXT,
    "assetId" TEXT,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CreatorStatus" NOT NULL DEFAULT 'ACTIVE',
    "tagline" TEXT NOT NULL DEFAULT '',
    "approvedPostCount" INTEGER NOT NULL DEFAULT 0,
    "probationComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorSeries" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" "PostKind" NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorSeriesSubscription" (
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorSeriesSubscription_pkey" PRIMARY KEY ("userId","seriesId")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "externalId" TEXT,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "airAt" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpisodeLocale" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "EpisodeLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonLocale" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "PersonLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityRelation" (
    "id" TEXT NOT NULL,
    "sourceType" "EntityType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" "EntityType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "role" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "spoilerLevel" INTEGER NOT NULL DEFAULT 0,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceCitation" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "licenseName" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceCitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSnapshot" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryEntry" (
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "status" "LibraryStatus" NOT NULL,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryEntry_pkey" PRIMARY KEY ("userId","seriesId")
);

-- CreateTable
CREATE TABLE "EpisodeProgress" (
    "userId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "status" "EpisodeProgressStatus" NOT NULL DEFAULT 'WATCHED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EpisodeProgress_pkey" PRIMARY KEY ("userId","episodeId")
);

-- CreateTable
CREATE TABLE "UserRating" (
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "note" TEXT,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("userId","seriesId")
);

-- CreateTable
CREATE TABLE "CuratedList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuratedList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuratedListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "seriesId" TEXT,
    "characterId" TEXT,
    "postId" TEXT,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuratedListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditProposal" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "EditProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "EditProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalChange" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB NOT NULL,
    "sourceUrl" TEXT NOT NULL,

    CONSTRAINT "ProposalChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityRevision" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ReviewDecisionKind" NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContributorTrustEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "kind" "ContributorTrustKind" NOT NULL,
    "points" INTEGER NOT NULL,
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContributorTrustEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionEventLocale" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "PredictionEventLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionMarket" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "PredictionMarketStatus" NOT NULL DEFAULT 'DRAFT',
    "resolutionSourceUrl" TEXT NOT NULL,
    "resolutionSourceLabel" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Hong_Kong',
    "edgeCaseRules" TEXT NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "challengeEndsAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "winningOutcomeId" TEXT,
    "liquidityParameter" INTEGER NOT NULL DEFAULT 20,
    "payoutPerShare" INTEGER NOT NULL DEFAULT 100,
    "yesShares" INTEGER NOT NULL DEFAULT 0,
    "noShares" INTEGER NOT NULL DEFAULT 0,
    "marketVersion" INTEGER NOT NULL DEFAULT 0,
    "reservedLiability" INTEGER NOT NULL DEFAULT 0,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionMarketLocale" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "edgeCaseRules" TEXT NOT NULL,

    CONSTRAINT "PredictionMarketLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionOutcome" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sharesOutstanding" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PredictionOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "totalCost" INTEGER NOT NULL DEFAULT 0,
    "settledAt" TIMESTAMP(3),
    "payout" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionTrade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "side" "PredictionTradeSide" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "feeAmount" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,
    "probabilityBeforeBps" INTEGER NOT NULL,
    "probabilityAfterBps" INTEGER NOT NULL,
    "marketVersion" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionRuleVersion" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionRuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OracleSource" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OracleSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResolutionProposal" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "outcomeId" TEXT,
    "proposedById" TEXT NOT NULL,
    "status" "PredictionResolutionStatus" NOT NULL DEFAULT 'PROPOSED',
    "evidenceUrl" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "challengeEndsAt" TIMESTAMP(3) NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ResolutionProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResolutionChallenge" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceUrl" TEXT NOT NULL,
    "accepted" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResolutionChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionTreasury" (
    "id" TEXT NOT NULL DEFAULT 'system',
    "balance" INTEGER NOT NULL DEFAULT 50000,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionTreasury_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Post_authorId_status_createdAt_idx" ON "Post"("authorId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Post_primaryCharacterId_status_publishedAt_idx" ON "Post"("primaryCharacterId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Post_seriesId_status_publishedAt_idx" ON "Post"("seriesId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "PostMedia_postId_status_sortOrder_idx" ON "PostMedia"("postId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "PostMedia_status_createdAt_idx" ON "PostMedia"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TopicLocale_topicId_locale_key" ON "TopicLocale"("topicId", "locale");

-- CreateIndex
CREATE INDEX "PostTopic_topicId_postId_idx" ON "PostTopic"("topicId", "postId");

-- CreateIndex
CREATE INDEX "PostSave_postId_createdAt_idx" ON "PostSave"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "PostReaction_postId_createdAt_idx" ON "PostReaction"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "UserFollow_targetId_createdAt_idx" ON "UserFollow"("targetId", "createdAt");

-- CreateIndex
CREATE INDEX "CharacterFollow_characterId_createdAt_idx" ON "CharacterFollow"("characterId", "createdAt");

-- CreateIndex
CREATE INDEX "TopicFollow_topicId_createdAt_idx" ON "TopicFollow"("topicId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_userId_updatedAt_idx" ON "Collection"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "CollectionItem_collectionId_sortOrder_idx" ON "CollectionItem"("collectionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "CreatorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorSeries_slug_key" ON "CreatorSeries"("slug");

-- CreateIndex
CREATE INDEX "CreatorSeries_creatorId_updatedAt_idx" ON "CreatorSeries"("creatorId", "updatedAt");

-- CreateIndex
CREATE INDEX "CreatorSeriesSubscription_seriesId_createdAt_idx" ON "CreatorSeriesSubscription"("seriesId", "createdAt");

-- CreateIndex
CREATE INDEX "Episode_airAt_idx" ON "Episode"("airAt");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_seriesId_number_key" ON "Episode"("seriesId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeLocale_episodeId_locale_key" ON "EpisodeLocale"("episodeId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Person_slug_key" ON "Person"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PersonLocale_personId_locale_key" ON "PersonLocale"("personId", "locale");

-- CreateIndex
CREATE INDEX "EntityRelation_sourceType_sourceId_sortOrder_idx" ON "EntityRelation"("sourceType", "sourceId", "sortOrder");

-- CreateIndex
CREATE INDEX "EntityRelation_targetType_targetId_idx" ON "EntityRelation"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityRelation_sourceType_sourceId_targetType_targetId_rela_key" ON "EntityRelation"("sourceType", "sourceId", "targetType", "targetId", "relationType");

-- CreateIndex
CREATE INDEX "SourceCitation_entityType_entityId_fieldKey_idx" ON "SourceCitation"("entityType", "entityId", "fieldKey");

-- CreateIndex
CREATE INDEX "ExternalSnapshot_provider_externalId_retrievedAt_idx" ON "ExternalSnapshot"("provider", "externalId", "retrievedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSnapshot_provider_entityType_entityId_checksum_key" ON "ExternalSnapshot"("provider", "entityType", "entityId", "checksum");

-- CreateIndex
CREATE INDEX "LibraryEntry_userId_status_updatedAt_idx" ON "LibraryEntry"("userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "EpisodeProgress_userId_updatedAt_idx" ON "EpisodeProgress"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "UserRating_seriesId_score_idx" ON "UserRating"("seriesId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "CuratedList_slug_key" ON "CuratedList"("slug");

-- CreateIndex
CREATE INDEX "CuratedList_userId_updatedAt_idx" ON "CuratedList"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "CuratedListItem_listId_sortOrder_idx" ON "CuratedListItem"("listId", "sortOrder");

-- CreateIndex
CREATE INDEX "EditProposal_status_createdAt_idx" ON "EditProposal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EditProposal_entityType_entityId_status_idx" ON "EditProposal"("entityType", "entityId", "status");

-- CreateIndex
CREATE INDEX "ProposalChange_proposalId_fieldKey_idx" ON "ProposalChange"("proposalId", "fieldKey");

-- CreateIndex
CREATE INDEX "EntityRevision_entityType_entityId_createdAt_idx" ON "EntityRevision"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EntityRevision_entityType_entityId_revision_key" ON "EntityRevision"("entityType", "entityId", "revision");

-- CreateIndex
CREATE INDEX "ReviewDecision_proposalId_createdAt_idx" ON "ReviewDecision"("proposalId", "createdAt");

-- CreateIndex
CREATE INDEX "ContributorTrustEvent_userId_createdAt_idx" ON "ContributorTrustEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionEvent_slug_key" ON "PredictionEvent"("slug");

-- CreateIndex
CREATE INDEX "PredictionEvent_featured_createdAt_idx" ON "PredictionEvent"("featured", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionEventLocale_eventId_locale_key" ON "PredictionEventLocale"("eventId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionMarket_slug_key" ON "PredictionMarket"("slug");

-- CreateIndex
CREATE INDEX "PredictionMarket_status_closesAt_idx" ON "PredictionMarket"("status", "closesAt");

-- CreateIndex
CREATE INDEX "PredictionMarket_eventId_status_idx" ON "PredictionMarket"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionMarketLocale_marketId_locale_key" ON "PredictionMarketLocale"("marketId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionOutcome_marketId_key_key" ON "PredictionOutcome"("marketId", "key");

-- CreateIndex
CREATE INDEX "PredictionPosition_userId_marketId_idx" ON "PredictionPosition"("userId", "marketId");

-- CreateIndex
CREATE INDEX "PredictionPosition_marketId_outcomeId_shares_idx" ON "PredictionPosition"("marketId", "outcomeId", "shares");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionPosition_userId_outcomeId_key" ON "PredictionPosition"("userId", "outcomeId");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionTrade_idempotencyKey_key" ON "PredictionTrade"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PredictionTrade_marketId_createdAt_idx" ON "PredictionTrade"("marketId", "createdAt");

-- CreateIndex
CREATE INDEX "PredictionTrade_userId_createdAt_idx" ON "PredictionTrade"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionRuleVersion_marketId_version_key" ON "PredictionRuleVersion"("marketId", "version");

-- CreateIndex
CREATE INDEX "OracleSource_marketId_priority_idx" ON "OracleSource"("marketId", "priority");

-- CreateIndex
CREATE INDEX "ResolutionProposal_marketId_status_proposedAt_idx" ON "ResolutionProposal"("marketId", "status", "proposedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResolutionChallenge_proposalId_userId_key" ON "ResolutionChallenge"("proposalId", "userId");

-- CreateIndex
CREATE INDEX "Comment_postId_status_createdAt_idx" ON "Comment"("postId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_predictionMarketId_status_createdAt_idx" ON "Comment"("predictionMarketId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_parentId_createdAt_idx" ON "Comment"("parentId", "createdAt");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_predictionMarketId_fkey" FOREIGN KEY ("predictionMarketId") REFERENCES "PredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_primaryCharacterId_fkey" FOREIGN KEY ("primaryCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_creatorSeriesId_fkey" FOREIGN KEY ("creatorSeriesId") REFERENCES "CreatorSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CharacterAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicLocale" ADD CONSTRAINT "TopicLocale_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTopic" ADD CONSTRAINT "PostTopic_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTopic" ADD CONSTRAINT "PostTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSave" ADD CONSTRAINT "PostSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSave" ADD CONSTRAINT "PostSave_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterFollow" ADD CONSTRAINT "CharacterFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterFollow" ADD CONSTRAINT "CharacterFollow_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicFollow" ADD CONSTRAINT "TopicFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicFollow" ADD CONSTRAINT "TopicFollow_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CharacterAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorSeries" ADD CONSTRAINT "CreatorSeries_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorSeriesSubscription" ADD CONSTRAINT "CreatorSeriesSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorSeriesSubscription" ADD CONSTRAINT "CreatorSeriesSubscription_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "CreatorSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeLocale" ADD CONSTRAINT "EpisodeLocale_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonLocale" ADD CONSTRAINT "PersonLocale_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeProgress" ADD CONSTRAINT "EpisodeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeProgress" ADD CONSTRAINT "EpisodeProgress_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuratedList" ADD CONSTRAINT "CuratedList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuratedListItem" ADD CONSTRAINT "CuratedListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "CuratedList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuratedListItem" ADD CONSTRAINT "CuratedListItem_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuratedListItem" ADD CONSTRAINT "CuratedListItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuratedListItem" ADD CONSTRAINT "CuratedListItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditProposal" ADD CONSTRAINT "EditProposal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalChange" ADD CONSTRAINT "ProposalChange_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "EditProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "EditProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributorTrustEvent" ADD CONSTRAINT "ContributorTrustEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributorTrustEvent" ADD CONSTRAINT "ContributorTrustEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionEventLocale" ADD CONSTRAINT "PredictionEventLocale_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PredictionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionMarket" ADD CONSTRAINT "PredictionMarket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PredictionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionMarketLocale" ADD CONSTRAINT "PredictionMarketLocale_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionOutcome" ADD CONSTRAINT "PredictionOutcome_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionPosition" ADD CONSTRAINT "PredictionPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionPosition" ADD CONSTRAINT "PredictionPosition_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionPosition" ADD CONSTRAINT "PredictionPosition_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "PredictionOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionTrade" ADD CONSTRAINT "PredictionTrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionTrade" ADD CONSTRAINT "PredictionTrade_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionTrade" ADD CONSTRAINT "PredictionTrade_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "PredictionOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionRuleVersion" ADD CONSTRAINT "PredictionRuleVersion_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OracleSource" ADD CONSTRAINT "OracleSource_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionProposal" ADD CONSTRAINT "ResolutionProposal_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionProposal" ADD CONSTRAINT "ResolutionProposal_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "PredictionOutcome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionProposal" ADD CONSTRAINT "ResolutionProposal_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionChallenge" ADD CONSTRAINT "ResolutionChallenge_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ResolutionProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionChallenge" ADD CONSTRAINT "ResolutionChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- V3 integrity checks keep social targets and the shared SUP prediction economy coherent.
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_single_target_check"
CHECK (num_nonnulls("characterId", "postId", "predictionMarketId") = 1);

ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_single_target_check"
CHECK (num_nonnulls("postId", "characterId", "assetId") = 1);

ALTER TABLE "CuratedListItem" ADD CONSTRAINT "CuratedListItem_single_target_check"
CHECK (num_nonnulls("seriesId", "characterId", "postId") = 1);

ALTER TABLE "Post" ADD CONSTRAINT "Post_nonnegative_views_check" CHECK ("viewCount" >= 0);
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_approved_count_check" CHECK ("approvedPostCount" >= 0);
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_score_check" CHECK ("score" BETWEEN 1 AND 10);
ALTER TABLE "EntityRelation" ADD CONSTRAINT "EntityRelation_spoiler_check" CHECK ("spoilerLevel" BETWEEN 0 AND 3);

ALTER TABLE "PredictionMarket" ADD CONSTRAINT "PredictionMarket_economy_check" CHECK (
  "liquidityParameter" > 0 AND "payoutPerShare" > 0 AND
  "yesShares" >= 0 AND "noShares" >= 0 AND "marketVersion" >= 0 AND
  "reservedLiability" >= 0 AND "participantCount" >= 0
);

ALTER TABLE "PredictionOutcome" ADD CONSTRAINT "PredictionOutcome_shares_check" CHECK ("sharesOutstanding" >= 0);
ALTER TABLE "PredictionPosition" ADD CONSTRAINT "PredictionPosition_values_check" CHECK (
  "shares" >= 0 AND "totalCost" >= 0 AND "payout" >= 0
);

ALTER TABLE "PredictionTrade" ADD CONSTRAINT "PredictionTrade_values_check" CHECK (
  "quantity" > 0 AND "grossAmount" >= 0 AND "feeAmount" >= 0 AND "netAmount" >= 0 AND
  "probabilityBeforeBps" BETWEEN 0 AND 10000 AND "probabilityAfterBps" BETWEEN 0 AND 10000 AND
  "marketVersion" >= 0
);

ALTER TABLE "PredictionTreasury" ADD CONSTRAINT "PredictionTreasury_values_check" CHECK (
  "balance" >= 0 AND "reserved" >= 0 AND "reserved" <= "balance"
);
