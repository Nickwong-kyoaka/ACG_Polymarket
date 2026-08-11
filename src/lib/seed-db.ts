import { seedSnapshot } from "../data/seed";
import { prisma } from "./prisma";
import type { SeedSnapshot } from "./types";

type SeedClient = typeof prisma;

function asDate(value?: string) {
  return value ? new Date(value) : undefined;
}

function jsonValue(value: unknown) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export async function seedDatabase(db: SeedClient = prisma, snapshot: SeedSnapshot = seedSnapshot) {
  for (const user of snapshot.users) {
    await db.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      },
      update: {
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      },
    });
  }

  for (const profile of snapshot.profiles) {
    await db.profile.upsert({
      where: { id: profile.id },
      create: profile,
      update: {
        handle: profile.handle,
        displayName: profile.displayName,
        bio: profile.bio,
        holdingsVisibility: profile.holdingsVisibility,
        favoriteTags: profile.favoriteTags,
        pinnedCharacterIds: profile.pinnedCharacterIds,
        equippedFrameAsset: profile.equippedFrameAsset,
        equippedThemeAsset: profile.equippedThemeAsset,
      },
    });
  }

  for (const wallet of snapshot.wallets) {
    await db.wallet.upsert({
      where: { id: wallet.id },
      create: wallet,
      update: {
        softBalance: wallet.softBalance,
        premiumBalance: wallet.premiumBalance,
      },
    });
  }

  for (const series of snapshot.series) {
    await db.series.upsert({
      where: { id: series.id },
      create: series,
      update: {
        slug: series.slug,
        title: series.title,
        summary: series.summary,
        rightsType: series.rightsType,
        metadataOnly: series.metadataOnly,
        bangumiUrl: series.bangumiUrl,
      },
    });
  }

  for (const definition of snapshot.attributeDefinitions) {
    await db.attributeDefinition.upsert({
      where: { id: definition.id },
      create: {
        id: definition.id,
        key: definition.key,
        label: definition.label,
        valueType: definition.valueType,
        filterable: definition.filterable,
        sortable: definition.sortable,
        displayable: definition.displayable,
        sensitive: definition.sensitive,
        spoiler: definition.spoiler,
        displayOrder: definition.displayOrder,
        options: {
          create:
            definition.options?.map((option, index) => ({
              label: option,
              value: option,
              displayOrder: index,
            })) ?? [],
        },
      },
      update: {
        key: definition.key,
        label: definition.label,
        valueType: definition.valueType,
        filterable: definition.filterable,
        sortable: definition.sortable,
        displayable: definition.displayable,
        sensitive: definition.sensitive,
        spoiler: definition.spoiler,
        displayOrder: definition.displayOrder,
      },
    });
  }

  const tagLabels = [...new Set(snapshot.characters.flatMap((character) => character.tags))];
  for (const label of tagLabels) {
    await db.characterTag.upsert({
      where: { label },
      create: { label },
      update: {},
    });
  }

  for (const character of snapshot.characters) {
    await db.character.upsert({
      where: { id: character.id },
      create: {
        id: character.id,
        seriesId: character.seriesId,
        slug: character.slug,
        name: character.name,
        title: character.title,
        summary: character.summary,
        fandomPrompt: character.fandomPrompt,
        mood: character.mood,
        rightsType: character.rightsType,
        metadataOnly: character.metadataOnly,
        basePrice: character.basePrice,
        priceStep: character.priceStep,
        unitsPerStep: character.unitsPerStep,
        circulatingUnits: character.circulatingUnits,
        supporterCount: character.supporterCount,
        isFeatured: character.isFeatured,
        accentFrom: character.accentFrom,
        accentTo: character.accentTo,
        relatedCharacterIds: character.relatedCharacterIds,
        releaseSeason: character.releaseSeason,
        sourceTitle: character.sourceTitle,
        favoritePhrase: character.favoritePhrase,
        externalScores: jsonValue(character.externalScores),
        tags: { connect: character.tags.map((label) => ({ label })) },
      },
      update: {
        slug: character.slug,
        name: character.name,
        title: character.title,
        summary: character.summary,
        fandomPrompt: character.fandomPrompt,
        mood: character.mood,
        rightsType: character.rightsType,
        metadataOnly: character.metadataOnly,
        basePrice: character.basePrice,
        priceStep: character.priceStep,
        unitsPerStep: character.unitsPerStep,
        circulatingUnits: character.circulatingUnits,
        supporterCount: character.supporterCount,
        isFeatured: character.isFeatured,
        accentFrom: character.accentFrom,
        accentTo: character.accentTo,
        relatedCharacterIds: character.relatedCharacterIds,
        releaseSeason: character.releaseSeason,
        sourceTitle: character.sourceTitle,
        favoritePhrase: character.favoritePhrase,
        externalScores: jsonValue(character.externalScores),
        tags: { set: character.tags.map((label) => ({ label })) },
      },
    });

    for (const attribute of character.attributeValues) {
      await db.characterAttributeValue.upsert({
        where: {
          characterId_definitionId: {
            characterId: character.id,
            definitionId: attribute.definitionId,
          },
        },
        create: {
          characterId: character.id,
          definitionId: attribute.definitionId,
          value: attribute.value,
        },
        update: { value: attribute.value },
      });
    }
  }

  for (const grant of snapshot.rightsGrants) {
    await db.rightsGrant.upsert({
      where: { id: grant.id },
      create: {
        id: grant.id,
        seriesId: grant.seriesId,
        characterId: grant.characterId,
        licensor: grant.licensor,
        contractReference: grant.contractReference,
        territories: grant.territories,
        salesChannels: grant.salesChannels,
        allowedUseTypes: grant.allowedUseTypes,
        attributionText: grant.attributionText,
        takedownContact: grant.takedownContact,
        embargoAt: asDate(grant.embargoAt),
        expiresAt: asDate(grant.expiresAt),
        commercialUse: grant.commercialUse,
      },
      update: {
        seriesId: grant.seriesId,
        characterId: grant.characterId,
        licensor: grant.licensor,
        contractReference: grant.contractReference,
        territories: grant.territories,
        salesChannels: grant.salesChannels,
        allowedUseTypes: grant.allowedUseTypes,
        attributionText: grant.attributionText,
        takedownContact: grant.takedownContact,
        embargoAt: asDate(grant.embargoAt),
        expiresAt: asDate(grant.expiresAt),
        commercialUse: grant.commercialUse,
      },
    });
  }

  for (const attribution of snapshot.sourceAttributions) {
    await db.sourceAttribution.upsert({
      where: { id: attribution.id },
      create: {
        id: attribution.id,
        characterId: attribution.characterId,
        sourceKind: attribution.sourceKind,
        sourceLabel: attribution.sourceLabel,
        sourceUrl: attribution.sourceUrl,
        licenseName: attribution.licenseName,
        attributionText: attribution.attributionText,
        importedText: attribution.importedText,
        originalAuthor: attribution.originalAuthor,
        importedAt: new Date(attribution.importedAt),
      },
      update: {
        sourceKind: attribution.sourceKind,
        sourceLabel: attribution.sourceLabel,
        sourceUrl: attribution.sourceUrl,
        licenseName: attribution.licenseName,
        attributionText: attribution.attributionText,
        importedText: attribution.importedText,
        originalAuthor: attribution.originalAuthor,
        importedAt: new Date(attribution.importedAt),
      },
    });
  }

  for (const asset of snapshot.assets) {
    await db.characterAsset.upsert({
      where: { id: asset.id },
      create: {
        id: asset.id,
        characterId: asset.characterId,
        kind: asset.kind,
        label: asset.label,
        storageKey: asset.storageKey,
        altText: asset.altText,
        workflowStatus: asset.workflowStatus,
        publishedAt: asDate(asset.publishedAt),
        version: asset.version,
        rightsGrantId: asset.rightsGrantId,
        metadata: jsonValue(asset.metadata),
        sourceKind: asset.sourceKind,
        sourceUrl: asset.sourceUrl,
        attributionText: asset.attributionText,
        takedownContact: asset.takedownContact,
      },
      update: {
        characterId: asset.characterId,
        kind: asset.kind,
        label: asset.label,
        storageKey: asset.storageKey,
        altText: asset.altText,
        workflowStatus: asset.workflowStatus,
        publishedAt: asDate(asset.publishedAt),
        version: asset.version,
        rightsGrantId: asset.rightsGrantId,
        metadata: jsonValue(asset.metadata),
        sourceKind: asset.sourceKind,
        sourceUrl: asset.sourceUrl,
        attributionText: asset.attributionText,
        takedownContact: asset.takedownContact,
      },
    });
  }

  for (const collection of snapshot.shopCollections) {
    await db.shopCollection.upsert({
      where: { id: collection.id },
      create: collection,
      update: {
        slug: collection.slug,
        title: collection.title,
        description: collection.description,
      },
    });
  }

  for (const item of snapshot.shopItems) {
    await db.shopItem.upsert({
      where: { id: item.id },
      create: {
        ...item,
        unlockPayload: jsonValue(item.unlockPayload)!,
      },
      update: {
        collectionId: item.collectionId,
        slug: item.slug,
        title: item.title,
        description: item.description,
        kind: item.kind,
        currencyType: item.currencyType,
        price: item.price,
        previewLabel: item.previewLabel,
        unlockPayload: jsonValue(item.unlockPayload)!,
        published: item.published,
      },
    });
  }

  for (const position of snapshot.positions) {
    await db.supportPosition.upsert({
      where: { id: position.id },
      create: {
        ...position,
        updatedAt: new Date(position.updatedAt),
      },
      update: {
        units: position.units,
        averageCost: position.averageCost,
      },
    });
  }

  for (const trade of snapshot.trades) {
    await db.trade.upsert({
      where: { id: trade.id },
      create: {
        ...trade,
        createdAt: new Date(trade.createdAt),
      },
      update: {
        side: trade.side,
        quantity: trade.quantity,
        totalCost: trade.totalCost,
        unitPrice: trade.unitPrice,
      },
    });
  }

  for (const entry of snapshot.ledgerEntries) {
    await db.ledgerEntry.upsert({
      where: { id: entry.id },
      create: {
        ...entry,
        createdAt: new Date(entry.createdAt),
      },
      update: {
        delta: entry.delta,
        balanceAfter: entry.balanceAfter,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        idempotencyKey: entry.idempotencyKey,
      },
    });
  }

  for (const claim of snapshot.dailyRewardClaims) {
    await db.dailyRewardClaim.upsert({
      where: { id: claim.id },
      create: {
        ...claim,
        claimedAt: new Date(claim.claimedAt),
      },
      update: {
        dayKey: claim.dayKey,
        amount: claim.amount,
        claimedAt: new Date(claim.claimedAt),
      },
    });
  }

  for (const claim of snapshot.adRewardClaims) {
    await db.adRewardClaim.upsert({
      where: { id: claim.id },
      create: {
        ...claim,
        claimedAt: new Date(claim.claimedAt),
      },
      update: {
        dayKey: claim.dayKey,
        amount: claim.amount,
        claimedAt: new Date(claim.claimedAt),
      },
    });
  }

  for (const item of snapshot.watchlistItems) {
    await db.watchlistItem.upsert({
      where: { id: item.id },
      create: {
        ...item,
        createdAt: new Date(item.createdAt),
      },
      update: {
        userId: item.userId,
        characterId: item.characterId,
      },
    });
  }

  for (const comment of snapshot.comments) {
    await db.comment.upsert({
      where: { id: comment.id },
      create: {
        ...comment,
        createdAt: new Date(comment.createdAt),
      },
      update: {
        content: comment.content,
      },
    });
  }

  for (const reaction of snapshot.reactions) {
    await db.reaction.upsert({
      where: { id: reaction.id },
      create: {
        ...reaction,
        createdAt: new Date(reaction.createdAt),
      },
      update: {
        kind: reaction.kind,
      },
    });
  }

  for (const notification of snapshot.notifications) {
    await db.notification.upsert({
      where: { id: notification.id },
      create: {
        ...notification,
        readAt: asDate(notification.readAt),
        createdAt: new Date(notification.createdAt),
      },
      update: {
        title: notification.title,
        body: notification.body,
        type: notification.type,
        readAt: asDate(notification.readAt),
      },
    });
  }

  for (const item of snapshot.inventoryItems) {
    await db.inventoryItem.upsert({
      where: { id: item.id },
      create: {
        ...item,
        createdAt: new Date(item.createdAt),
      },
      update: {
        equipped: item.equipped,
      },
    });
  }

  for (const mode of snapshot.comfortModes) {
    await db.comfortMode.upsert({
      where: { id: mode.id },
      create: mode,
      update: {
        slug: mode.slug,
        title: mode.title,
        subtitle: mode.subtitle,
        description: mode.description,
        promptLabel: mode.promptLabel,
        accentFrom: mode.accentFrom,
        accentTo: mode.accentTo,
        sortOrder: mode.sortOrder,
      },
    });
  }

  for (const content of snapshot.comfortContents) {
    await db.comfortContent.upsert({
      where: { id: content.id },
      create: {
        id: content.id,
        modeId: content.modeId,
        characterId: content.characterId,
        kind: content.kind,
        title: content.title,
        body: content.body,
        mediaUrl: content.mediaUrl,
        sweetnessLevel: content.sweetnessLevel,
        unlockShopItemId: content.unlockShopItemId,
        published: content.published,
        metadata: jsonValue(content.metadata),
      },
      update: {
        modeId: content.modeId,
        characterId: content.characterId,
        kind: content.kind,
        title: content.title,
        body: content.body,
        mediaUrl: content.mediaUrl,
        sweetnessLevel: content.sweetnessLevel,
        unlockShopItemId: content.unlockShopItemId,
        published: content.published,
        metadata: jsonValue(content.metadata),
      },
    });
  }
}
