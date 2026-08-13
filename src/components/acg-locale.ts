import type { Character, ShopItem } from "@/lib/types";

export const publicLocales = ["en", "zh-Hant"] as const;

export type PublicLocale = (typeof publicLocales)[number];

export function isPublicLocale(value: string): value is PublicLocale {
  return publicLocales.includes(value as PublicLocale);
}

export function normalizePublicLocale(value?: string | null): PublicLocale {
  return value === "zh-Hant" || value === "cn" || value?.toLowerCase().startsWith("zh")
    ? "zh-Hant"
    : "en";
}

export function localePath(locale: PublicLocale, path = "/") {
  const normalizedPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalizedPath}`;
}

export function stripLocale(pathname: string) {
  for (const locale of publicLocales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

export function localeFromPathname(pathname: string): PublicLocale {
  const segment = pathname.split("/").filter(Boolean)[0];
  return normalizePublicLocale(segment);
}

export function pick<T>(locale: PublicLocale, english: T, chinese: T): T {
  return locale === "zh-Hant" ? chinese : english;
}

const characterCopy: Record<
  string,
  Record<PublicLocale, Partial<Pick<Character, "name" | "title" | "summary" | "fandomPrompt" | "favoritePhrase">>>
> = {
  "akari-hoshino": {
    en: {},
    "zh-Hant": {
      name: "星野明里",
      title: "《星光節拍》的訊號隊長",
      summary: "明里把每一個舞台都變成明天仍會閃耀的約定。她讓應援成為一起發光，而不是只能選一邊的競賽。",
      fandomPrompt: "如果你喜歡坦率的領導力、重新振作與舞台上的太陽，請把今天的心意交給明里。",
      favoritePhrase: "你已經走到這裡了，下一段路讓我們一起發光。",
    },
  },
  "ren-tsukishiro": {
    en: {},
    "zh-Hant": {
      name: "月城蓮",
      title: "《星光節拍》的戰術作曲家",
      summary: "蓮讀懂趨勢、旋律與人群的情緒，卻從不把粉絲變成對手。支持他像是在收藏一段安靜而可靠的才華。",
      fandomPrompt: "如果你喜歡沉著的戰略家、深夜歌單與不喧鬧的陪伴，蓮會替你留一盞燈。",
      favoritePhrase: "不必急著回答世界，先聽完屬於你的這一小節。",
    },
  },
  "mira-kagetsu": {
    en: {},
    "zh-Hant": {
      name: "花月米菈",
      title: "《星光節拍》的百變舞者",
      summary: "米菈最喜歡觀眾發現自己可以同時喜歡很多角色的瞬間。她的路線屬於快樂收藏家、壁紙獵人與驚喜派對。",
      fandomPrompt: "想要爆發力、調皮互動與期間限定外觀，就把應援棒揮向米菈。",
      favoritePhrase: "喜歡不需要排他，心裡的位置比你想像中更多。",
    },
  },
  "shiori-archive": {
    en: { name: "Shiori, Archive Keeper" },
    "zh-Hant": {
      name: "詩織・檔案員",
      title: "Bangumi 資料優先示範席",
      summary: "詩織展示授權角色如何只以資料、標籤與來源標記出現在市場，而不依賴未獲許可的官方媒體。",
      fandomPrompt: "如果你在意作品資料的保存、來源與安靜的陪伴，請支持詩織的檔案席。",
      favoritePhrase: "沉重的念頭先放在我這裡，明天再決定要不要取回。",
    },
  },
  "yatogami-tohka": {
    en: { name: "Tohka Yatogami", title: "Princess support signal" },
    "zh-Hant": {
      name: "夜刀神十香",
      title: "公主應援訊號",
      summary: "《約會大作戰》的資料型示範角色，以直接、溫暖與充滿活力的陪伴作為應援主題。",
      fandomPrompt: "如果你喜歡坦率的情感、吃東西時的幸福感與劍光般的勇氣，請支持十香。",
      favoritePhrase: "讓我用全部的力氣替你加油！",
    },
  },
  "tokisaki-kurumi": {
    en: { name: "Kurumi Tokisaki", title: "Nightmare support signal" },
    "zh-Hant": {
      name: "時崎狂三",
      title: "夢魘應援訊號",
      summary: "《約會大作戰》的資料型示範角色，聚焦神秘魅力、午夜氛圍與收藏型外觀。",
      fandomPrompt: "如果你喜歡哥德氣質、戲劇性的平靜與午夜主題，請支持狂三。",
      favoritePhrase: "受傷的心，可以暫時在這裡休息一下。",
    },
  },
  "mushoku-tensei-iii-signal": {
    en: { name: "Mushoku Tensei III Signal" },
    "zh-Hant": { name: "《無職轉生 III》訊號", title: "2026 夏季高熱度資料席", summary: "來自 2026 夏季番資料的應援入口，以安全的資料卡方式加入當季發現頁。", fandomPrompt: "期待新季度與新的成長篇章，就把這個席位加入關注。", favoritePhrase: "新的季度，也可以成為更好的篇章。" },
  },
  "supermarket-smoking-signal": {
    en: { name: "Smoking Behind the Supermarket Signal" },
    "zh-Hant": { name: "《在超市後面吸菸的兩人》訊號", title: "安靜成人系季番資料席", summary: "適合喜歡下班後的對話、低調溫柔與成人角色互動的資料型應援席。", fandomPrompt: "喜歡晚班、慢節奏交流與不張揚的默契，就收藏這個訊號。", favoritePhrase: "回去面對世界前，先慢慢呼吸一次。" },
  },
  "yani-neko-signal": {
    en: { name: "Yani Neko Signal" },
    "zh-Hant": { name: "《菸貓》訊號", title: "混亂系吉祥物季番資料席", summary: "用怪趣笑點與貓系混亂感測試當季熱門瀏覽的資料型席位。", fandomPrompt: "如果你的安慰語言是奇怪笑話和混亂貓咪能量，這個訊號屬於你。", favoritePhrase: "奇怪地活著，也是一種撐過今天的方法。" },
  },
  "you-and-i-are-polar-opposites-s2-signal": {
    en: { name: "You and I Are Polar Opposites S2 Signal" },
    "zh-Hant": { name: "《正相反的你與我 第二季》訊號", title: "戀愛動能季番資料席", summary: "為喜歡互補關係與溫暖校園互動的粉絲準備的資料型應援席。", fandomPrompt: "喜歡不同個性慢慢學會並肩前進，就為這個訊號留一顆心。", favoritePhrase: "不同的心，也能以相同的步伐前進。" },
  },
  "ghost-in-the-shell-2026-signal": {
    en: { name: "Ghost in the Shell 2026 Signal" },
    "zh-Hant": { name: "《攻殼機動隊 2026》訊號", title: "電馭叛客季番資料席", summary: "讓經典科幻作品以資料與來源標記出現在 2026 夏季探索中的應援席。", fandomPrompt: "希望在市場看見科幻傳承與電馭叛客作品，就關注這個訊號。", favoritePhrase: "即使靈魂接上網路，也值得一處柔軟的落點。" },
  },
};

export function localizeCharacter(character: Character, locale: PublicLocale): Character {
  return { ...character, ...(characterCopy[character.slug]?.[locale] ?? {}) };
}

const attributeLabels: Record<string, string> = {
  archetype: "角色類型",
  market_affinity: "應援親和度",
  crew_role: "角色定位",
  vibe_meter: "氛圍指數",
  source_policy: "來源政策",
  sweetness: "甜度",
  comfort_style: "安慰方式",
  voice_tone: "聲線氣質",
  asmr_tags: "ASMR 標籤",
  external_score_snapshot: "外部評分快照",
};

export function localizeAttribute<T extends { key: string; label: string; value: string }>(
  character: Character,
  attribute: T,
  locale: PublicLocale,
): T {
  if (locale === "en") return attribute;
  const archetypes: Record<string, string> = { Leader: "領隊", Strategist: "戰略家", Wildcard: "百變型", Healer: "療癒型" };
  let value = attribute.value;
  if (attribute.key === "archetype") value = archetypes[value] ?? value;
  if (attribute.key === "market_affinity") value = `適合想以收藏、陪伴與正向留言支持 ${localizeCharacter(character, locale).name} 的粉絲。`;
  if (attribute.key === "crew_role") value = character.metadataOnly ? "作品資料應援席" : "原創角色企劃成員";
  if (attribute.key === "source_policy") value = character.metadataOnly ? "只展示可追蹤來源的作品資料，不包含官方媒體素材。" : "原創角色與平台自有示範素材。";
  if (attribute.key === "comfort_style") value = "以角色語氣提供溫柔陪伴，不使用角色對立或勝負語言。";
  if (attribute.key === "voice_tone") value = character.metadataOnly ? "待授權或原創示範音訊上架" : "依角色氣質設計的原創示範聲線";
  if (attribute.key === "asmr_tags") value = character.tags.map((tag) => `#${tag}`).join("  ");
  if (attribute.key === "external_score_snapshot") value = "外部站點資料快照，更新日期與來源請查看下方標記。";
  return { ...attribute, label: attributeLabels[attribute.key] ?? attribute.label, value };
}

const shopCopy: Record<string, Record<PublicLocale, Partial<ShopItem>>> = {
  "sakura-ring-frame": {
    en: {},
    "zh-Hant": { title: "櫻環頭像框", description: "以柔和花瓣包圍頭像，適合溫柔但堅定的應援者。", previewLabel: "櫻花光環" },
  },
  "sunrise-trader-theme": {
    en: { title: "Sunrise Support Theme" },
    "zh-Hant": { title: "朝陽應援主題", description: "明亮暖色的玩家房間主題，為每天的應援開一扇晨光。", previewLabel: "暖色應援台" },
  },
  "comfort-archive-wallpaper": {
    en: {},
    "zh-Hant": { title: "安慰檔案館壁紙", description: "為壓力安慰模式與平靜個人頁製作的 AI 原創柔焦壁紙。", previewLabel: "呼吸檔案館" },
  },
};

export function localizeShopItem(item: ShopItem, locale: PublicLocale): ShopItem {
  return { ...item, ...(shopCopy[item.slug]?.[locale] ?? {}) };
}

export function formatHongKongDate(value: string, locale: PublicLocale) {
  const shifted = new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000);
  const stamp = shifted.toISOString().slice(0, 16).replace("T", " ");
  return locale === "zh-Hant" ? `${stamp} 香港時間` : `${stamp} HKT`;
}

export const exchangeCopy = {
  en: {
    nav: { home: "Lobby", market: "Signals", comfort: "Comfort", shop: "Booth", work: "Work", me: "My room" },
    common: { original: "Original IP", metadata: "Metadata signal", quote: "Support quote", supporters: "Supporters", comments: "Messages", units: "units", open: "Enter signal", watch: "Watch", watching: "Watching", signIn: "Sign in", sup: "SUP" },
    trade: { title: "Support ticket", buyQuote: "Buy quote", sellQuote: "Return quote", balance: "Wallet", held: "Held", quantity: "Units", buy: "Send support", sell: "Return units", notice: "System exchange only. No shorting, P2P orders, cash-out, or character-versus-character bets.", failed: "The exchange could not complete this action.", bought: "Support sent successfully.", sold: "Units returned successfully.", signIn: "Sign in to send support" },
    rewards: { title: "Daily energy", daily: "Claim +100", ad: "Rewarded ad +20", dailyDone: "Daily SUP received.", adDone: "Rewarded SUP received.", failed: "Reward could not be claimed." },
    shop: { unlock: "Unlock", equipped: "Equipped", equipAgain: "Equip", done: "Cosmetic unlocked and equipped.", failed: "Could not complete this booth order.", owned: "In collection" },
    comments: { placeholder: "Write what you love about this character...", post: "Leave a message", posted: "Your message joined the support wall.", failed: "Message could not be posted.", reactFailed: "Reaction could not be sent.", supporter: "Supporter", guest: "guest", cheer: "Cheer", heart: "Heart", hype: "Spark" },
  },
  "zh-Hant": {
    nav: { home: "大廳", market: "訊號", comfort: "安慰室", shop: "攤位", work: "打工", me: "我的房間" },
    common: { original: "原創 IP", metadata: "資料型訊號", quote: "目前應援價", supporters: "應援者", comments: "留言", units: "份", open: "進入角色訊號", watch: "關注", watching: "關注中", signIn: "登入", sup: "SUP" },
    trade: { title: "應援票券", buyQuote: "支持價格", sellQuote: "退回價格", balance: "錢包", held: "持有", quantity: "份數", buy: "送出應援", sell: "退回份數", notice: "只與系統交換，不設做空、玩家配對、出金或角色對賭。", failed: "交易站未能完成這次操作。", bought: "應援已成功送達。", sold: "應援份數已退回。", signIn: "登入後送出應援" },
    rewards: { title: "每日能量", daily: "簽到 +100", ad: "獎勵廣告 +20", dailyDone: "今天的 SUP 已入帳。", adDone: "廣告獎勵 SUP 已入帳。", failed: "暫時無法領取獎勵。" },
    shop: { unlock: "解鎖", equipped: "已裝備", equipAgain: "裝備", done: "外觀已解鎖並裝備。", failed: "攤位未能完成這次兌換。", owned: "已收藏" },
    comments: { placeholder: "寫下你喜歡這個角色的原因……", post: "留下心意", posted: "你的心意已加入應援牆。", failed: "暫時無法送出留言。", reactFailed: "暫時無法送出反應。", supporter: "應援者", guest: "訪客", cheer: "加油", heart: "心動", hype: "閃耀" },
  },
} as const;

export function getExchangeCopy(locale: PublicLocale) {
  return exchangeCopy[locale];
}
