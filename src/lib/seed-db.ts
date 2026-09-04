import { seedSnapshot } from "../data/seed";
import { prisma } from "./prisma";
import type { SeedSnapshot } from "./types";
import { localizeCharacter, localizeShopItem } from "@/components/acg-locale";
import { catalogCharactersV2, catalogSeriesV2 } from "@/data/catalog-v2";
import { syncApprovedMedia } from "@/lib/approved-media";

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
  "low-confidence": ["信心修補站", "慢慢找回自己的步伐", "讓角色看見你已經付出的努力，再陪你把下一步縮到剛好可以做到。", "我想重新站穩一點"],
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

const v3Topics = [
  { id: "topic-season-watch", slug: "season-watch", en: ["Season watch", "Weekly premieres, impressions, and small discoveries."], zh: ["本季追番", "每週新番、觀後感與剛剛遇見的小發現。"] },
  { id: "topic-outfit-notes", slug: "outfit-notes", en: ["Outfit notes", "Character looks, palettes, and wardrobe details worth saving."], zh: ["角色衣裝簿", "值得收藏的角色造型、配色與服裝細節。"] },
  { id: "topic-comfort-corner", slug: "comfort-corner", en: ["Comfort corner", "Gentle character moments for slower evenings."], zh: ["安慰角落", "留給慢一點的夜晚與角色陪伴。"] },
  { id: "topic-prediction-desk", slug: "prediction-desk", en: ["Prediction desk", "Source-led questions about upcoming ACG news."], zh: ["季番預測桌", "用公開來源一起觀察下一則 ACG 消息。"] },
] as const;

async function seedV3Experience(db: SeedClient, snapshot: SeedSnapshot) {
  const viewerId = snapshot.users[0]?.id;
  if (!viewerId) return;

  for (const topic of v3Topics) {
    await db.topic.upsert({
      where: { slug: topic.slug },
      create: { id: topic.id, slug: topic.slug, title: topic.en[0], description: topic.en[1], featured: true },
      update: { title: topic.en[0], description: topic.en[1], featured: true },
    });
    for (const [locale, copy] of [["EN", topic.en], ["ZH_HANT", topic.zh]] as const) {
      await db.topicLocale.upsert({
        where: { topicId_locale: { topicId: topic.id, locale } },
        create: { topicId: topic.id, locale, title: copy[0], description: copy[1] },
        update: { title: copy[0], description: copy[1] },
      });
    }
  }

  await db.creatorProfile.upsert({
    where: { userId: viewerId },
    create: { userId: viewerId, tagline: "Character notes, quiet rooms, and seasonal signals.", approvedPostCount: 3, probationComplete: true },
    update: { approvedPostCount: 3, probationComplete: true },
  });
  await db.creatorProfile.upsert({
    where: { userId: "community-seed-001" },
    create: { userId: "community-seed-001", tagline: "The ACG Exchange editorial desk.", approvedPostCount: 12, probationComplete: true },
    update: { approvedPostCount: 12, probationComplete: true },
  });

  const seededPosts = [
    { id: "post-v3-akari-night", slug: "akari-night-support-look", characterId: "char-akari", assetId: "asset-akari-night-support", topicId: "topic-outfit-notes", kind: "OUTFIT" as const, title: "A midnight support look for Akari", body: "Warm stage light, a quieter jacket, and the kind of smile that makes the walk home feel shorter.", language: "EN" as const },
    { id: "post-v3-kurumi-clock", slug: "kurumi-clockwork-gallery-note", characterId: "char-kurumi", assetId: "asset-tokisaki-kurumi-primary", topicId: "topic-outfit-notes", kind: "NOTE" as const, title: "Clockwork details worth opening twice", body: "A source-linked gallery note collecting the red, black, and antique-clock motifs around Kurumi's signal page.", language: "EN" as const },
    { id: "post-v3-frieren-evening", slug: "frieren-slow-evening-note", characterId: "char-frieren", assetId: "asset-frieren-primary", topicId: "topic-comfort-corner", kind: "GUIDE" as const, title: "給步調很慢的夜晚", body: "不需要立刻完成所有事。先把今天收進書頁，再替明天留下一小格空白。", language: "ZH_HANT" as const },
    { id: "post-v3-bocchi-practice", slug: "bocchi-small-practice-win", characterId: "char-hitori-gotoh", assetId: "asset-hitori-gotoh-primary", topicId: "topic-comfort-corner", kind: "COMIC" as const, title: "今天只練完八小節，也算完成", body: "把巨大目標剪成一張便條紙。完成以後，回來替自己按一顆小小的心。", language: "ZH_HANT" as const },
    { id: "post-v3-summer-desk", slug: "summer-2026-weekly-watchdesk", characterId: "char-motoko-kusanagi", assetId: "asset-motoko-kusanagi-primary", topicId: "topic-season-watch", kind: "PREDICTION_TAKE" as const, title: "Summer watchdesk: three signals to follow", body: "Broadcast dates, official announcements, and catalog movement gathered into one calm weekly desk.", language: "EN" as const },
    { id: "post-v3-tohka-snack", slug: "tohka-after-school-note", characterId: "char-tohka", assetId: "asset-yatogami-tohka-primary", topicId: "topic-season-watch", kind: "NOTE" as const, title: "十香的放學後補給時間", body: "今天的應援手帳只記一件事：好好吃飯，也是一種替明天充電的方法。", language: "ZH_HANT" as const },
  ];

  for (const [index, post] of seededPosts.entries()) {
    await db.post.upsert({
      where: { slug: post.slug },
      create: { id: post.id, authorId: index % 2 === 0 ? viewerId : "community-seed-001", slug: post.slug, language: post.language, kind: post.kind, status: "PUBLISHED", title: post.title, body: post.body, primaryCharacterId: post.characterId, publishedAt: new Date(Date.UTC(2026, 7, 27 + index, 10 + index, 0, 0)), viewCount: 48 + index * 17 },
      update: { title: post.title, body: post.body, status: "PUBLISHED", primaryCharacterId: post.characterId },
    });
    await db.postMedia.upsert({
      where: { id: `${post.id}-media` },
      create: { id: `${post.id}-media`, postId: post.id, assetId: post.assetId, altText: `${post.title} character visual`, status: "APPROVED", sortOrder: 0, reviewedAt: new Date("2026-08-30T08:00:00.000Z"), reviewedById: viewerId },
      update: { assetId: post.assetId, altText: `${post.title} character visual`, status: "APPROVED" },
    });
    await db.postTopic.upsert({
      where: { postId_topicId: { postId: post.id, topicId: post.topicId } },
      create: { postId: post.id, topicId: post.topicId },
      update: {},
    });
  }

  const seededReactions = [
    [viewerId, "post-v3-kurumi-clock", "HEART"],
    [viewerId, "post-v3-bocchi-practice", "HEART"],
    [viewerId, "post-v3-tohka-snack", "CHEER"],
    ["community-seed-001", "post-v3-akari-night", "HEART"],
    ["community-seed-001", "post-v3-frieren-evening", "HEART"],
    ["community-seed-001", "post-v3-summer-desk", "CHEER"],
  ] as const;
  for (const [userId, postId, kind] of seededReactions) {
    await db.postReaction.upsert({
      where: { userId_postId_kind: { userId, postId, kind } },
      create: { userId, postId, kind },
      update: {},
    });
  }

  const seededPostComments = [
    { id: "comment-v3-akari-night", userId: viewerId, postId: "post-v3-akari-night", content: "The warmer palette really suits this quieter stage mood." },
    { id: "comment-v3-frieren-evening", userId: "community-seed-001", postId: "post-v3-frieren-evening", content: "今晚就先完成一小格，明天再慢慢繼續。" },
    { id: "comment-v3-tohka-snack", userId: viewerId, postId: "post-v3-tohka-snack", content: "十香的補給提醒已經收進今晚的收藏櫃。" },
  ];
  for (const comment of seededPostComments) {
    await db.comment.upsert({
      where: { id: comment.id },
      create: { ...comment, status: "VISIBLE" },
      update: { content: comment.content, status: "VISIBLE" },
    });
  }

  await db.userFollow.upsert({
    where: { followerId_targetId: { followerId: viewerId, targetId: "community-seed-001" } },
    create: { followerId: viewerId, targetId: "community-seed-001" },
    update: {},
  });

  await db.postSave.upsert({
    where: { userId_postId: { userId: viewerId, postId: "post-v3-frieren-evening" } },
    create: { userId: viewerId, postId: "post-v3-frieren-evening" },
    update: {},
  });
  for (const characterId of ["char-akari", "char-frieren", "char-hitori-gotoh"]) {
    await db.characterFollow.upsert({
      where: { userId_characterId: { userId: viewerId, characterId } },
      create: { userId: viewerId, characterId },
      update: {},
    });
  }
  await db.topicFollow.upsert({
    where: { userId_topicId: { userId: viewerId, topicId: "topic-season-watch" } },
    create: { userId: viewerId, topicId: "topic-season-watch" },
    update: {},
  });

  const collection = await db.collection.upsert({
    where: { slug: "kyoaka-evening-shelf" },
    create: { id: "collection-v3-evening", userId: viewerId, slug: "kyoaka-evening-shelf", title: "Evening shelf", description: "Comfort notes and looks to revisit after a long day." },
    update: { title: "Evening shelf", description: "Comfort notes and looks to revisit after a long day." },
  });
  await db.collectionItem.upsert({
    where: { id: "collection-item-v3-frieren" },
    create: { id: "collection-item-v3-frieren", collectionId: collection.id, postId: "post-v3-frieren-evening", sortOrder: 0 },
    update: { collectionId: collection.id, postId: "post-v3-frieren-evening", characterId: null, assetId: null },
  });

  const featuredSeries = await db.series.findMany({ take: 6, orderBy: { title: "asc" } });
  for (const [index, series] of featuredSeries.entries()) {
    const episode = await db.episode.upsert({
      where: { seriesId_number: { seriesId: series.id, number: 1 } },
      create: { seriesId: series.id, number: 1, title: "Episode 1", airAt: new Date(Date.UTC(2026, 8, 5 + index, 13, 0, 0)), sourceUrl: series.bangumiUrl },
      update: { airAt: new Date(Date.UTC(2026, 8, 5 + index, 13, 0, 0)) },
    });
    await db.episodeLocale.upsert({
      where: { episodeId_locale: { episodeId: episode.id, locale: "ZH_HANT" } },
      create: { episodeId: episode.id, locale: "ZH_HANT", title: "第 1 話" },
      update: { title: "第 1 話" },
    });
  }
  if (featuredSeries[0]) {
    await db.libraryEntry.upsert({
      where: { userId_seriesId: { userId: viewerId, seriesId: featuredSeries[0].id } },
      create: { userId: viewerId, seriesId: featuredSeries[0].id, status: "WATCHING" },
      update: { status: "WATCHING" },
    });
  }

  const predictionEvents = [
    { id: "prediction-event-summer-2026", slug: "summer-2026-watchdesk", category: "SEASON", en: ["Summer 2026 watchdesk", "Objective signals around the current anime season."], zh: ["2026 夏季觀測桌", "一起追蹤本季動畫的公開消息與資料訊號。"] },
    { id: "prediction-event-announcements", slug: "acg-announcement-watch", category: "ANNOUNCEMENT", en: ["Announcement watch", "Source-led questions about upcoming official ACG news."], zh: ["作品情報觀測", "以公開來源追蹤即將到來的作品消息。"] },
  ] as const;
  for (const event of predictionEvents) {
    await db.predictionEvent.upsert({ where: { slug: event.slug }, create: { id: event.id, slug: event.slug, category: event.category, title: event.en[0], description: event.en[1], featured: true }, update: { title: event.en[0], description: event.en[1], featured: true } });
    for (const [locale, copy] of [["EN", event.en], ["ZH_HANT", event.zh]] as const) {
      await db.predictionEventLocale.upsert({ where: { eventId_locale: { eventId: event.id, locale } }, create: { eventId: event.id, locale, title: copy[0], description: copy[1] }, update: { title: copy[0], description: copy[1] } });
    }
  }

  const predictionMarkets = [
    { id: "prediction-market-frieren-news", eventId: "prediction-event-announcements", slug: "frieren-official-news-before-2027", en: ["Will Frieren receive a new official animation update before 2027?", "Resolve Yes only if an official production account or website publishes a new animation project update before the deadline."], zh: ["《葬送的芙莉蓮》會在 2027 年前公布新的動畫消息嗎？", "只有官方製作帳號或網站在截止前發布新的動畫企劃消息，才結算為 Yes。"], source: "https://frieren-anime.jp/", sourceLabel: "Official Frieren anime site", closesAt: "2026-12-31T14:00:00.000Z" },
    { id: "prediction-market-dal-news", eventId: "prediction-event-announcements", slug: "date-a-live-animation-update-q1-2027", en: ["Will Date A Live publish a new animation update by March 2027?", "Resolve from the official Date A Live website or verified production account."], zh: ["《約會大作戰》會在 2027 年 3 月前發布新的動畫消息嗎？", "以《約會大作戰》官方網站或經驗證的製作帳號為結算來源。"], source: "https://date-a-live5th-anime.com/", sourceLabel: "Official Date A Live site", closesAt: "2027-03-31T14:00:00.000Z" },
    { id: "prediction-market-bangumi-threshold", eventId: "prediction-event-summer-2026", slug: "summer-title-bangumi-collection-threshold", en: ["Will the featured summer title reach the published Bangumi collection threshold?", "Resolve using the captured Bangumi subject total at 23:00 Hong Kong time on the deadline."], zh: ["本季焦點作品會達到指定的 Bangumi 收藏門檻嗎？", "以截止日香港時間 23:00 保存的 Bangumi 條目收藏數快照結算。"], source: "https://bangumi.tv/anime/tag/2026%E5%A4%8F", sourceLabel: "Bangumi 2026 summer index", closesAt: "2026-10-31T15:00:00.000Z" },
  ] as const;
  const reservePerMarket = Math.ceil(100 * 20 * Math.log(2));
  for (const marketData of predictionMarkets) {
    const market = await db.predictionMarket.upsert({
      where: { slug: marketData.slug },
      create: { id: marketData.id, eventId: marketData.eventId, slug: marketData.slug, question: marketData.en[0], description: marketData.en[1], status: "OPEN", resolutionSourceUrl: marketData.source, resolutionSourceLabel: marketData.sourceLabel, edgeCaseRules: "If the source is unavailable or the wording cannot be resolved objectively, void and refund the market.", closesAt: new Date(marketData.closesAt), reservedLiability: reservePerMarket },
      update: { question: marketData.en[0], description: marketData.en[1], resolutionSourceUrl: marketData.source, resolutionSourceLabel: marketData.sourceLabel, closesAt: new Date(marketData.closesAt), reservedLiability: reservePerMarket },
    });
    for (const [locale, copy, edgeCaseRules] of [["EN", marketData.en, "If the source is unavailable or the wording cannot be resolved objectively, void and refund the market."], ["ZH_HANT", marketData.zh, "若來源無法存取或問題不能客觀判定，市場作廢並退款。"]] as const) {
      await db.predictionMarketLocale.upsert({ where: { marketId_locale: { marketId: market.id, locale } }, create: { marketId: market.id, locale, question: copy[0], description: copy[1], edgeCaseRules }, update: { question: copy[0], description: copy[1], edgeCaseRules } });
    }
    for (const [key, label] of [["YES", "Yes"], ["NO", "No"]] as const) {
      await db.predictionOutcome.upsert({ where: { marketId_key: { marketId: market.id, key } }, create: { marketId: market.id, key, label }, update: { label } });
    }
    await db.oracleSource.upsert({ where: { id: `${market.id}-oracle` }, create: { id: `${market.id}-oracle`, marketId: market.id, label: marketData.sourceLabel, url: marketData.source, priority: 1 }, update: { label: marketData.sourceLabel, url: marketData.source } });
    await db.predictionRuleVersion.upsert({ where: { marketId_version: { marketId: market.id, version: 1 } }, create: { marketId: market.id, version: 1, snapshot: { question: marketData.en[0], source: marketData.source, closesAt: marketData.closesAt } }, update: {} });
  }
  await db.predictionTreasury.upsert({
    where: { id: "system" },
    create: { id: "system", balance: 50_000, reserved: predictionMarkets.length * reservePerMarket },
    update: { balance: 50_000, reserved: predictionMarkets.length * reservePerMarket },
  });
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
        const zhHantAltText = typeof asset.metadata?.altTextZhHant === "string"
          ? asset.metadata.altTextZhHant
          : `${catalog.name["zh-Hant"]} 的${catalog.seriesSlug === "starlit-cadence" ? "平台原創 AI 主視覺" : "抽象應援訊號立繪；未內含第三方角色圖片"}。`;
        for (const [locale, altText] of [["EN", asset.altText], ["ZH_HANT", zhHantAltText]] as const) {
          await db.characterAssetLocale.upsert({ where: { assetId_locale: { assetId: asset.id, locale } }, create: { assetId: asset.id, locale, altText }, update: { altText } });
        }
      }
    }
  }

  await syncApprovedMedia(db);

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

  await seedV3Experience(db, snapshot);
}
