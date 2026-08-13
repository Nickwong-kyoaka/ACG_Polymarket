import { seedSnapshot } from "../data/seed";
import { prisma } from "./prisma";
import type { SeedSnapshot } from "./types";
import { localizeCharacter, localizeShopItem } from "@/components/acg-locale";
import { catalogCharactersV2, catalogSeriesV2 } from "@/data/catalog-v2";

type SeedClient = typeof prisma;

function asDate(value?: string) {
  return value ? new Date(value) : undefined;
}

function jsonValue(value: unknown) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

const seriesZhHant: Record<string, { title: string; summary: string }> = {
  "series-starlit": {
    title: "星光節拍",
    summary: "為 ACG 應援市場打造的原創角色企劃，以舞台、音樂與溫柔陪伴連結粉絲。",
  },
  "series-archive": {
    title: "檔案館示範企劃",
    summary: "展示資料來源、權利標記與安全素材流程的資料型作品。",
  },
  "series-date-a-live": {
    title: "約會大作戰",
    summary: "以 Bangumi 資料與來源標記建立的角色應援示範，不包含未獲授權的官方媒體。",
  },
  "series-bangumi-2026-summer": {
    title: "Bangumi 2026 夏季番訊號",
    summary: "以資料卡方式展示 2026 夏季作品與熱門訊號。",
  },
};

const attributeZhHant: Record<string, string> = {
  sweetness: "甜度",
  comfort_style: "安慰風格",
  voice_tone: "聲線",
  archetype: "角色類型",
  asmr_tags: "ASMR 標籤",
  source_title: "來源作品",
  release_season: "播出季度",
};

const comfortModeZhHant: Record<string, [string, string, string, string]> = {
  loneliness: ["孤單陪伴室", "有人在你這邊", "房間太安靜時，讓角色在身邊坐一會。", "我現在不想一個人"],
  stress: ["壓力融化室", "先把呼吸拿回來", "用短句、慢節奏與柔和應援卸下今天的壓力。", "我壓力很大，想先平靜下來"],
  "study-fatigue": ["讀書充電站", "今天已經很努力了", "為讀書、工作與截止日前的疲憊準備一位桌邊夥伴。", "讀書或工作讓我的腦袋很累"],
  sleep: ["晚安小宇宙", "把今天輕輕放下", "降低刺激，用安靜語音與環境音陪你準備休息。", "我想睡，但腦袋停不下來"],
  "low-confidence": ["信心修補站", "你不是失敗品", "在自我懷疑時給予真誠肯定，不用空洞的正能量。", "我覺得自己做得不夠好"],
  heartbreak: ["心碎可可室", "心碎也可以被抱住", "為想念、拒絕與感情失落準備不批判的甜味空間。", "我的心很痛，想要一點溫柔"],
};

const comfortContentZhHant: Record<string, [string, string]> = {
  "comfort-akari-lonely-talk": ["明里替你保留第一排", "你已經來到這裡，這本身就很了不起。陪我聽完一首歌吧，今晚沒有人需要獨自發光。"],
  "comfort-ren-sleep-asmr": ["蓮的午夜節拍器", "跟著四拍吸氣、六拍吐氣，讓今天慢慢闔上最後一頁。"],
  "comfort-mira-study-comic": ["三格點心休息時間", "第一格，米菈拿走課本；第二格，她貼滿愛心便條；第三格，一個小任務忽然沒那麼可怕。"],
  "comfort-tohka-confidence-talk": ["十香相信最直接的答案", "只要你還願意嘗試，就不算輸。先吃點溫暖的東西，再讓我大聲替你加油。"],
  "comfort-kurumi-heartbreak-voice": ["狂三的絲絨重整", "想被愛並不代表你的心很傻。先在這段安靜裡休息一下。"],
  "comfort-shiori-stress-wallpaper": ["檔案館呼吸壁紙", "配合緩慢呼吸設計的原創漸層壁紙，讓安慰室與玩家房間更平靜。"],
};

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
    const catalogSeries = catalogSeriesV2.find((entry) => entry.slug === series.slug);
    const zh = catalogSeries
      ? { title: catalogSeries.title["zh-Hant"], summary: `收錄 ${catalogSeries.title["zh-Hant"]} 角色的正向應援訊號，不包含現金交易或對立排行。` }
      : seriesZhHant[series.id] ?? { title: series.title, summary: series.summary };
    await db.seriesLocale.upsert({
      where: { seriesId_locale: { seriesId: series.id, locale: "EN" } },
      create: { seriesId: series.id, locale: "EN", title: series.title, summary: series.summary },
      update: { title: series.title, summary: series.summary },
    });
    await db.seriesLocale.upsert({
      where: { seriesId_locale: { seriesId: series.id, locale: "ZH_HANT" } },
      create: { seriesId: series.id, locale: "ZH_HANT", ...zh },
      update: zh,
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
    for (const locale of ["EN", "ZH_HANT"] as const) {
      const label = locale === "ZH_HANT" ? attributeZhHant[definition.key] ?? definition.label : definition.label;
      await db.attributeDefinitionLocale.upsert({
        where: { definitionId_locale: { definitionId: definition.id, locale } },
        create: { definitionId: definition.id, locale, label },
        update: { label },
      });
    }
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
        publishStatus: "PUBLISHED",
        basePrice: character.basePrice,
        priceStep: character.priceStep,
        unitsPerStep: character.unitsPerStep,
        circulatingUnits: character.circulatingUnits,
        supporterCount: character.supporterCount,
        marketVersion: character.marketVersion ?? 0,
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
        publishStatus: "PUBLISHED",
        basePrice: character.basePrice,
        priceStep: character.priceStep,
        unitsPerStep: character.unitsPerStep,
        circulatingUnits: character.circulatingUnits,
        supporterCount: character.supporterCount,
        marketVersion: character.marketVersion ?? 0,
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
    for (const [locale, publicLocale] of [["EN", "en"], ["ZH_HANT", "zh-Hant"]] as const) {
      const localized = localizeCharacter(character, publicLocale);
      await db.characterLocale.upsert({
        where: { characterId_locale: { characterId: character.id, locale } },
        create: {
          characterId: character.id,
          locale,
          name: localized.name,
          title: localized.title,
          summary: localized.summary,
          fandomPrompt: localized.fandomPrompt,
          mood: localized.mood,
          favoritePhrase: localized.favoritePhrase,
        },
        update: {
          name: localized.name,
          title: localized.title,
          summary: localized.summary,
          fandomPrompt: localized.fandomPrompt,
          mood: localized.mood,
          favoritePhrase: localized.favoritePhrase,
        },
      });
    }

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
        sourceLabel: asset.sourceLabel,
        licenseName: asset.licenseName,
        publicUrl: asset.publicUrl,
        mimeType: asset.mimeType,
        byteSize: asset.byteSize,
        aiPrompt: asset.aiPrompt,
        aiModel: asset.aiModel,
        permissionStatus: asset.permissionStatus ?? "UNVERIFIED",
        contentRating: asset.contentRating ?? "UNRATED",
        creatorName: asset.creatorName,
        creatorUrl: asset.creatorUrl,
        originalMediaUrl: asset.originalMediaUrl,
        licenseUrl: asset.licenseUrl,
        permissionEvidence: asset.permissionEvidence,
        commercialUseAllowed: asset.commercialUseAllowed ?? false,
        adaptationAllowed: asset.adaptationAllowed ?? false,
        retrievedAt: asDate(asset.retrievedAt),
        checksum: asset.checksum,
        reviewedAt: asDate(asset.reviewedAt),
        reviewNotes: asset.reviewNotes,
        riskAcknowledgedAt: asDate(asset.riskAcknowledgedAt),
        primaryPriority: asset.primaryPriority ?? 0,
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
        sourceLabel: asset.sourceLabel,
        licenseName: asset.licenseName,
        publicUrl: asset.publicUrl,
        mimeType: asset.mimeType,
        byteSize: asset.byteSize,
        aiPrompt: asset.aiPrompt,
        aiModel: asset.aiModel,
        permissionStatus: asset.permissionStatus ?? "UNVERIFIED",
        contentRating: asset.contentRating ?? "UNRATED",
        creatorName: asset.creatorName,
        creatorUrl: asset.creatorUrl,
        originalMediaUrl: asset.originalMediaUrl,
        licenseUrl: asset.licenseUrl,
        permissionEvidence: asset.permissionEvidence,
        commercialUseAllowed: asset.commercialUseAllowed ?? false,
        adaptationAllowed: asset.adaptationAllowed ?? false,
        retrievedAt: asDate(asset.retrievedAt),
        checksum: asset.checksum,
        reviewedAt: asDate(asset.reviewedAt),
        reviewNotes: asset.reviewNotes,
        riskAcknowledgedAt: asDate(asset.riskAcknowledgedAt),
        primaryPriority: asset.primaryPriority ?? 0,
      },
    });
    if (asset.characterId) {
      const catalog = catalogCharactersV2.find((entry) => `char-${entry.slug}` === asset.characterId || ({ "akari-hoshino": "char-akari", "ren-tsukishiro": "char-ren", "mira-kagetsu": "char-mira", "yatogami-tohka": "char-tohka", "tokisaki-kurumi": "char-kurumi" }[entry.slug] === asset.characterId));
      if (catalog) {
        for (const [locale, altText] of [["EN", asset.altText], ["ZH_HANT", `${catalog.name["zh-Hant"]} 的${catalog.seriesSlug === "starlit-cadence" ? "平台原創 AI 主視覺" : "抽象應援訊號立繪；未內含第三方角色圖片"}。`]] as const) {
          await db.characterAssetLocale.upsert({ where: { assetId_locale: { assetId: asset.id, locale } }, create: { assetId: asset.id, locale, altText }, update: { altText } });
        }
      }
    }
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
    for (const [locale, publicLocale] of [["EN", "en"], ["ZH_HANT", "zh-Hant"]] as const) {
      const localized = localizeShopItem(item, publicLocale);
      await db.shopItemLocale.upsert({
        where: { shopItemId_locale: { shopItemId: item.id, locale } },
        create: {
          shopItemId: item.id,
          locale,
          title: localized.title,
          description: localized.description,
          previewLabel: localized.previewLabel,
        },
        update: {
          title: localized.title,
          description: localized.description,
          previewLabel: localized.previewLabel,
        },
      });
    }
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
        id: trade.id,
        userId: trade.userId,
        characterId: trade.characterId,
        side: trade.side,
        quantity: trade.quantity,
        totalCost: trade.totalCost,
        unitPrice: trade.unitPrice,
        quoteBefore: trade.quoteBefore ?? trade.unitPrice,
        quoteAfter: trade.quoteAfter ?? trade.unitPrice,
        supplyBefore: trade.supplyBefore ?? 0,
        supplyAfter: trade.supplyAfter ?? trade.quantity,
        firstUnitPrice: trade.firstUnitPrice ?? trade.unitPrice,
        lastUnitPrice: trade.lastUnitPrice ?? trade.unitPrice,
        averageUnitPrice: trade.averageUnitPrice ?? trade.unitPrice,
        marketVersion: trade.marketVersion ?? 0,
        idempotencyKey: trade.idempotencyKey ?? `seed-${trade.id}`,
        createdAt: new Date(trade.createdAt),
      },
      update: {
        side: trade.side,
        quantity: trade.quantity,
        totalCost: trade.totalCost,
        unitPrice: trade.unitPrice,
        quoteBefore: trade.quoteBefore ?? trade.unitPrice,
        quoteAfter: trade.quoteAfter ?? trade.unitPrice,
        supplyBefore: trade.supplyBefore ?? 0,
        supplyAfter: trade.supplyAfter ?? trade.quantity,
        firstUnitPrice: trade.firstUnitPrice ?? trade.unitPrice,
        lastUnitPrice: trade.lastUnitPrice ?? trade.unitPrice,
        averageUnitPrice: trade.averageUnitPrice ?? trade.unitPrice,
        marketVersion: trade.marketVersion ?? 0,
        idempotencyKey: trade.idempotencyKey ?? `seed-${trade.id}`,
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
    const zh = comfortModeZhHant[mode.slug] ?? [mode.title, mode.subtitle, mode.description, mode.promptLabel];
    await db.comfortModeLocale.upsert({
      where: { modeId_locale: { modeId: mode.id, locale: "EN" } },
      create: { modeId: mode.id, locale: "EN", title: mode.title, subtitle: mode.subtitle, description: mode.description, promptLabel: mode.promptLabel },
      update: { title: mode.title, subtitle: mode.subtitle, description: mode.description, promptLabel: mode.promptLabel },
    });
    await db.comfortModeLocale.upsert({
      where: { modeId_locale: { modeId: mode.id, locale: "ZH_HANT" } },
      create: { modeId: mode.id, locale: "ZH_HANT", title: zh[0], subtitle: zh[1], description: zh[2], promptLabel: zh[3] },
      update: { title: zh[0], subtitle: zh[1], description: zh[2], promptLabel: zh[3] },
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
    const zh = comfortContentZhHant[content.id] ?? [content.title, content.body];
    await db.comfortContentLocale.upsert({
      where: { contentId_locale: { contentId: content.id, locale: "EN" } },
      create: { contentId: content.id, locale: "EN", title: content.title, body: content.body },
      update: { title: content.title, body: content.body },
    });
    await db.comfortContentLocale.upsert({
      where: { contentId_locale: { contentId: content.id, locale: "ZH_HANT" } },
      create: { contentId: content.id, locale: "ZH_HANT", title: zh[0], body: zh[1] },
      update: { title: zh[0], body: zh[1] },
    });
  }

  if (snapshot.characters.length === 24) {
    const startsAt = new Date("2026-07-13T08:00:00.000Z");
    const endsAt = new Date("2026-12-31T15:59:59.000Z");
    for (const catalog of catalogCharactersV2) {
      const character = snapshot.characters.find((entry) => entry.slug === catalog.slug)!;
      const campaignId = `campaign-${catalog.slug}`;
      const campaign = await db.supportCampaign.upsert({
        where: { slug: `${catalog.slug}-shared-signal` },
        create: { id: campaignId, characterId: character.id, slug: `${catalog.slug}-shared-signal`, status: "ACTIVE", title: `${catalog.name.en} Shared Signal`, description: catalog.fandomPrompt.en, goalUnits: catalog.market.campaignGoal, currentUnits: character.circulatingUnits, startsAt, endsAt },
        update: { characterId: character.id, status: "ACTIVE", title: `${catalog.name.en} Shared Signal`, description: catalog.fandomPrompt.en, goalUnits: catalog.market.campaignGoal, currentUnits: character.circulatingUnits, startsAt, endsAt },
      });
      for (const [locale, title, description] of [["EN", `${catalog.name.en} Shared Signal`, catalog.fandomPrompt.en], ["ZH_HANT", `${catalog.name["zh-Hant"]}共同應援`, catalog.fandomPrompt["zh-Hant"]]] as const) {
        await db.supportCampaignLocale.upsert({ where: { campaignId_locale: { campaignId: campaign.id, locale } }, create: { campaignId: campaign.id, locale, title, description }, update: { title, description } });
      }
      const rewards = [
        { thresholdUnits: Math.ceil(catalog.market.campaignGoal * 0.25), kind: "BADGE" as const, label: "Spark Badge／星光徽章", referenceId: null },
        { thresholdUnits: Math.ceil(catalog.market.campaignGoal * 0.5), kind: "SHOP_ITEM" as const, label: "Wallpaper Drop／壁紙解鎖", referenceId: "shop-wallpaper-comfort-archive" },
        { thresholdUnits: catalog.market.campaignGoal, kind: "COMFORT_CONTENT" as const, label: "Comfort Story／安慰故事", referenceId: null },
      ];
      for (const reward of rewards) await db.supportCampaignReward.upsert({ where: { campaignId_thresholdUnits_kind: { campaignId: campaign.id, thresholdUnits: reward.thresholdUnits, kind: reward.kind } }, create: { campaignId: campaign.id, ...reward }, update: { label: reward.label, referenceId: reward.referenceId } });
      await db.campaignContribution.upsert({ where: { campaignId_userId: { campaignId: campaign.id, userId: "community-seed-001" } }, create: { campaignId: campaign.id, userId: "community-seed-001", units: character.circulatingUnits, badgeLevel: character.circulatingUnits >= 25 ? 2 : 1, lastContributedAt: new Date("2026-08-13T08:00:00.000Z") }, update: { units: character.circulatingUnits, badgeLevel: character.circulatingUnits >= 25 ? 2 : 1, lastContributedAt: new Date("2026-08-13T08:00:00.000Z") } });
    }
  }
}
