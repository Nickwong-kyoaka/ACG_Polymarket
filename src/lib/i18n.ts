export const locales = ["en", "cn"] as const;

export type Locale = (typeof locales)[number];

export function normalizeLocale(value?: string | null): Locale {
  return value === "cn" ? "cn" : "en";
}

export function hrefWithLocale(href: string, locale: Locale) {
  const [pathname, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("lang", locale);
  return `${pathname}?${params.toString()}`;
}

export const localeCopy = {
  en: {
    languageName: "English",
    languageShort: "ENG",
    alternateShort: "CN",
    brand: {
      name: "ACG Support Market",
      badge: "Beta Lounge",
      pulse: "New season signal",
    },
    nav: {
      discover: "Discover",
      market: "Market",
      comfort: "Comfort",
      me: "Me",
      admin: "Admin",
    },
    common: {
      originalIp: "Original IP",
      licensedMetadata: "Licensed Metadata",
      attributionFirst: "Attribution First",
      metadataOnly: "Metadata only",
      quote: "Quote",
      supporters: "Supporters",
      comments: "Comments",
      openCharacter: "Open character booth",
      rights: "Rights",
      source: "Source",
      yes: "Yes",
      no: "No",
      supported: "Supported",
      soldBack: "Sold back",
      units: "units",
      room: "Room",
      locked: "Locked",
    },
    home: {
      eyebrow: "Anime fandom support lounge",
      title: "Come home to the characters you keep thinking about.",
      description:
        "Earn soft SUP, support favorites, collect avatar frames and wallpapers, then leave a small note beside the character who made your day.",
      marketCta: "Enter support market",
      onboardingCta: "Start onboarding",
      comfortCta: "Open comfort room",
      walletEyebrow: "Current demo wallet",
      walletLabel: "Soft balance",
      walletBody:
        "Starter SUP, daily check-ins, character shifts, and return quotes keep the room moving.",
      rulesTitle: "Around the room",
      rules: [
        "Support tickets show their platform quote before confirmation.",
        "Character galleries keep source notes close to every image.",
        "Frames, themes, and wallpapers make the room feel like yours.",
      ],
      featuredEyebrow: "Featured booths",
      featuredTitle: "Launch characters with support energy",
      featuredDescription:
        "The card language feels like a fandom booth: character mood, source safety, quote, comments, and a path to support.",
      howEyebrow: "Loop",
      howTitle: "Daily tokens become visible affection",
      howDescription:
        "A soft economy for users who want to cheer, collect, and decorate rather than argue.",
      loopCards: [
        {
          title: "Check in daily",
          body: "Hong Kong daily reset grants 100 SUP once per day so the app stays welcoming.",
        },
        {
          title: "Support favorites",
          body: "Preview a platform quote, choose a quantity, and keep the support units on your character shelf.",
        },
        {
          title: "Unlock ACG flair",
          body: "Frames, wallpapers, and profile themes let users show love in a cozy public way.",
        },
      ],
      activityEyebrow: "Live ribbon",
      activityTitle: "Activity feels like notes left beside a favorite",
      activityDescription:
        "The feed highlights who received support instead of ranking characters as winners and losers.",
      cosmeticsEyebrow: "Shop preview",
      cosmeticsTitle: "Avatar frames and wallpapers become the first expression layer",
      cosmeticsDescription:
        "Soft tokens stay in-platform. Ads and cosmetics can monetize the beta while the market remains entertainment.",
    },
    market: {
      eyebrow: "Support market",
      title: "Browse character booths",
      description:
        "Search by title, tag, source, or the kind of company you want nearby today.",
      searchPlaceholder: "Search by name, title, or tag",
      tagPlaceholder: "Tag e.g. idol",
      allRights: "All rights types",
      original: "Original",
      licensed: "Licensed metadata",
      apply: "Apply filters",
      empty: "No booths match this filter yet.",
    },
    character: {
      attributeEyebrow: "Character sheet",
      attributeTitle: "ACG attributes, comfort style, and market signal",
      attributeDescription:
        "The table keeps sweetness, voice tone, archetype, source title, and support-market context visible without making it a rivalry board.",
      rightsEyebrow: "Rights and provenance",
      rightsTitle: "Assets and imported text stay traceable",
      rightsDescription:
        "Bangumi-compatible text keeps source and license markers. Assets publish through the admin source workflow.",
      sourceAttribution: "Source attribution",
      contract: "Contract",
      allowedUses: "Allowed uses",
      commercialUse: "Commercial use",
    },
    trade: {
      buyQuote: "Buy quote",
      sellQuote: "Sell quote",
      balance: "Your balance",
      heldUnits: "Held units",
      quantity: "Units",
      buy: "Buy support",
      sell: "Sell back",
      notice:
        "The platform desk holds each previewed quote briefly so you can check the total before sending support.",
      buyDone: "Support units added.",
      sellDone: "Support units sold back.",
      failed: "Trade failed.",
    },
    comments: {
      placeholder: "Share what you love about this character.",
      post: "Post appreciation",
      posted: "Comment posted.",
      failed: "Unable to post comment.",
      reactFailed: "Unable to react.",
      supporter: "Supporter",
      guest: "guest",
    },
    me: {
      eyebrow: "Me",
      title: "Your support desk",
      description:
        "Track support units, reward history, watchlist momentum, and equipped cosmetics from one cozy profile page.",
      walletBalance: "Wallet balance",
      holdingsEmpty: "No support units yet. Pick a booth and start softly.",
      recentFeed: "Recent support feed",
      publicProfile: "Open public profile",
      shopEyebrow: "Cosmetic shop",
      shopTitle: "Equip frames and themes without changing the support rules",
      shopDescription:
        "Purchases stay separate from the support ledger. Cosmetics are the safe place for ad-driven revenue and future premium unlocks.",
    },
    rewards: {
      loop: "Reward loop",
      daily: "Claim daily check-in",
      ad: "Claim ad reward",
      dailyDone: "Daily reward claimed.",
      adDone: "Rewarded ad payout received.",
      failed: "Reward claim failed.",
    },
    shop: {
      failed: "Purchase failed.",
      done: "Cosmetic unlocked and equipped.",
      unlock: "Unlock",
      equipped: "Equipped",
      equipAgain: "Equip again",
    },
    comfort: {
      eyebrow: "Healing fandom room",
      title: "Sweet support for days when your favorite character feels like home.",
      description:
        "Pick a comfort mode, read soft lines, hear a character voice, and carry the moment back to your room.",
      chooseCta: "Choose a comfort mode",
      marketCta: "Visit support market",
      tonight: "Tonight preview",
      chooseEyebrow: "Choose a need",
      chooseTitle: "Six rooms for different kinds of tired",
      chooseDescription:
        "Each mode has a sweet-talk deck, voice placeholders, comic panels, unlocks, and a positive support CTA.",
      loopEyebrow: "Positive loop",
      loopTitle: "Read, listen, support, unlock",
      loopDescription:
        "The comfort page is a soft front door into the support economy: emotional expression first, token spending second.",
      sampleEyebrow: "Sample deck",
      sampleTitle: "Soft words before market action",
      sampleDescription:
        "A mode can become a daily ritual before the user checks in, claims tokens, or supports a favorite.",
      mediaEyebrow: "Voice and comic preview",
      mediaTitle: "Slots for ASMR, voice, and sweet story panels",
      mediaDescription:
        "These cards reserve space for future admin-uploaded or AI-generated comfort assets.",
      notice:
        "Comfort rooms are fandom entertainment, not therapy, medical care, or crisis support. If you feel unsafe, contact local emergency services or someone you trust now.",
    },
  },
  cn: {
    languageName: "中文",
    languageShort: "CN",
    alternateShort: "ENG",
    brand: {
      name: "ACG 角色應援市場",
      badge: "Beta 應援室",
      pulse: "新番訊號接收中",
    },
    nav: {
      discover: "探索",
      market: "市場",
      comfort: "安慰室",
      me: "我的",
      admin: "管理",
    },
    common: {
      originalIp: "原創角色",
      licensedMetadata: "授權資料",
      attributionFirst: "來源優先",
      metadataOnly: "僅資料展示",
      quote: "應援價",
      supporters: "應援人數",
      comments: "留言",
      openCharacter: "進入角色攤位",
      rights: "權利",
      source: "來源",
      yes: "是",
      no: "否",
      supported: "應援了",
      soldBack: "賣回系統",
      units: "份",
      room: "房間",
      locked: "未解鎖",
    },
    home: {
      eyebrow: "新番角色應援 Lounge",
      title: "回到那些總會讓你想起的角色身邊。",
      description:
        "每日領取 SUP、支持喜歡的角色、收藏頭像框與壁紙，再把一句心意留在讓你開心的角色身邊。",
      marketCta: "進入應援市場",
      onboardingCta: "開始新手流程",
      comfortCta: "打開安慰室",
      walletEyebrow: "目前 Demo 錢包",
      walletLabel: "軟代幣餘額",
      walletBody: "起始 SUP、每日簽到、角色打工與退回報價，讓房間每天都有一點新進度。",
      rulesTitle: "房間裡的小事",
      rules: [
        "每張應援票券都會先顯示平台報價。",
        "角色畫廊會替每張圖片留下來源手帳。",
        "頭像框、主題與壁紙會讓房間更像自己。",
      ],
      featuredEyebrow: "推薦攤位",
      featuredTitle: "第一波帶著應援能量登場的角色",
      featuredDescription:
        "卡片更像漫展攤位：角色心情、來源狀態、應援價、留言與進入支持的路徑都清楚可見。",
      howEyebrow: "循環",
      howTitle: "每日代幣變成看得見的喜歡",
      howDescription: "給想歡呼、收藏、裝飾，而不是吵架的 ACG 用戶一個柔軟經濟。",
      loopCards: [
        {
          title: "每日簽到",
          body: "以香港時間重置，每天領 100 SUP，讓新用戶也能輕鬆加入。",
        },
        {
          title: "支持本命",
          body: "先看看系統報價與總額，再把應援份數收進自己的角色架。",
        },
        {
          title: "解鎖 ACG 外觀",
          body: "頭像框、壁紙與個人頁主題，讓喜歡可以被溫柔地展示出來。",
        },
      ],
      activityEyebrow: "即時應援",
      activityTitle: "動態像歡呼，不像戰績炫耀",
      activityDescription: "動態重點是誰被喜歡，而不是誰打敗了誰。",
      cosmeticsEyebrow: "商店預覽",
      cosmeticsTitle: "頭像框與壁紙是第一層可營收的表達",
      cosmeticsDescription:
        "代幣留在站內，廣告與外觀承擔商業模式，角色市場仍保持娛樂性。",
    },
    market: {
      eyebrow: "應援市場",
      title: "瀏覽角色攤位",
      description:
        "用作品、標籤、素材來源或今天需要的陪伴方式，找到想多看一眼的角色。",
      searchPlaceholder: "搜尋角色、作品或標籤",
      tagPlaceholder: "標籤，例如 idol",
      allRights: "所有權利類型",
      original: "原創",
      licensed: "授權資料",
      apply: "套用篩選",
      empty: "暫時沒有符合條件的攤位。",
    },
    character: {
      attributeEyebrow: "角色屬性表",
      attributeTitle: "ACG 屬性、安慰風格與市場訊號",
      attributeDescription:
        "甜度、聲線、角色類型、來源作品與應援數據，都收進同一張角色手帳。",
      rightsEyebrow: "權利與來源",
      rightsTitle: "素材與引用文字保持可追蹤",
      rightsDescription:
        "Bangumi 相容文字保留來源與授權標記，素材則走管理後台的來源流程。",
      sourceAttribution: "來源標記",
      contract: "合約",
      allowedUses: "允許用途",
      commercialUse: "商用",
    },
    trade: {
      buyQuote: "買入應援價",
      sellQuote: "賣回價",
      balance: "你的餘額",
      heldUnits: "持有份數",
      quantity: "份數",
      buy: "買入應援",
      sell: "賣回系統",
      notice: "平台會短暫保留預覽報價，讓你確認總額後再把心意送出。",
      buyDone: "已增加應援份數。",
      sellDone: "已賣回系統。",
      failed: "交易失敗。",
    },
    comments: {
      placeholder: "寫下你喜歡這個角色的地方。",
      post: "送出喜歡",
      posted: "留言已送出。",
      failed: "無法送出留言。",
      reactFailed: "無法更新反應。",
      supporter: "應援者",
      guest: "訪客",
    },
    me: {
      eyebrow: "我的",
      title: "你的應援工作台",
      description: "在同一頁查看持倉、獎勵紀錄、關注列表與已裝備外觀。",
      walletBalance: "錢包餘額",
      holdingsEmpty: "還沒有應援份數。選一個角色攤位，慢慢開始就好。",
      recentFeed: "最近應援動態",
      publicProfile: "打開公開個人頁",
      shopEyebrow: "外觀商店",
      shopTitle: "裝備頭像框與主題，不改變應援規則",
      shopDescription:
        "購買外觀與應援帳本分開，廣告收益與未來付費外觀都可以放在這一層。",
    },
    rewards: {
      loop: "獎勵循環",
      daily: "領取每日簽到",
      ad: "領取廣告獎勵",
      dailyDone: "每日獎勵已領取。",
      adDone: "廣告獎勵已入帳。",
      failed: "獎勵領取失敗。",
    },
    shop: {
      failed: "購買失敗。",
      done: "外觀已解鎖並裝備。",
      unlock: "解鎖",
      equipped: "已裝備",
      equipAgain: "再次裝備",
    },
    comfort: {
      eyebrow: "安撫心靈的 ACG 房間",
      title: "當本命像家的時候，讓甜甜的應援先接住你。",
      description:
        "選一種需要，讀幾張情話卡，預覽語音與 ASMR 位置，再用沒有對立的方式支持角色。",
      chooseCta: "選擇安慰模式",
      marketCta: "前往應援市場",
      tonight: "今晚預覽",
      chooseEyebrow: "選擇需要",
      chooseTitle: "六種疲憊，各有一間房",
      chooseDescription:
        "每個模式都有情話卡、語音位置、連環畫面板、可解鎖外觀與正向應援 CTA。",
      loopEyebrow: "正向循環",
      loopTitle: "閱讀、聆聽、應援、解鎖",
      loopDescription:
        "安慰室是市場的柔軟入口：先安放情緒，再自然進入代幣循環。",
      sampleEyebrow: "情話卡示範",
      sampleTitle: "在市場行動前，先給自己一句軟糖",
      sampleDescription: "它可以成為每日儀式：簽到、領代幣、再支持喜歡的角色。",
      mediaEyebrow: "語音與連環畫預覽",
      mediaTitle: "預留 ASMR、立繪語音與甜度爆炸漫畫位置",
      mediaDescription: "這些卡片為未來管理員上傳或 AI 生成素材預留產品表面。",
      notice:
        "安慰室是粉絲娛樂，不是治療、醫療或危機支援。如果你覺得不安全，請立刻聯絡當地緊急服務或信任的人。",
    },
  },
} as const;

export function getCopy(locale: Locale) {
  return localeCopy[locale];
}
