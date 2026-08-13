export type CatalogLocale = "en" | "zh-Hant";

export interface LocalizedCatalogText {
  en: string;
  "zh-Hant": string;
}

export interface CatalogSeriesV2 {
  slug: string;
  title: LocalizedCatalogText;
  originalTitle: string;
  rightsType: "ORIGINAL" | "LICENSED";
}

export interface CatalogCharacterV2 {
  id: string;
  slug: string;
  seriesSlug: string;
  name: LocalizedCatalogText;
  originalName: string;
  headline: LocalizedCatalogText;
  summary: LocalizedCatalogText;
  fandomPrompt: LocalizedCatalogText;
  tags: Record<CatalogLocale, string[]>;
  comfortStyle: LocalizedCatalogText;
  releaseSeason: string;
  market: {
    basePrice: number;
    priceStep: number;
    unitsPerStep: number;
    campaignGoal: number;
  };
  authoritativeSource: {
    kind: "PLATFORM_ORIGINAL" | "OFFICIAL_CHARACTER_PAGE" | "OFFICIAL_SERIES_PAGE";
    label: string;
    url: string | null;
    retrievedAt: string;
  };
}

const retrievedAt = "2026-08-13T08:00:00.000Z";

export const catalogSeriesV2: CatalogSeriesV2[] = [
  {
    slug: "starlit-cadence",
    title: { en: "Starlit Cadence", "zh-Hant": "星律共鳴" },
    originalTitle: "Starlit Cadence",
    rightsType: "ORIGINAL",
  },
  {
    slug: "date-a-live",
    title: { en: "Date A Live", "zh-Hant": "約會大作戰" },
    originalTitle: "デート・ア・ライブ",
    rightsType: "LICENSED",
  },
  {
    slug: "mushoku-tensei",
    title: { en: "Mushoku Tensei: Jobless Reincarnation", "zh-Hant": "無職轉生～到了異世界就拿出真本事～" },
    originalTitle: "無職転生 ～異世界行ったら本気だす～",
    rightsType: "LICENSED",
  },
  {
    slug: "smoking-behind-the-supermarket",
    title: { en: "Smoking Behind the Supermarket with You", "zh-Hant": "躲在超市後門抽菸的兩人" },
    originalTitle: "スーパーの裏でヤニ吸うふたり",
    rightsType: "LICENSED",
  },
  {
    slug: "yani-neko",
    title: { en: "Yani Neko", "zh-Hant": "菸癮貓" },
    originalTitle: "ヤニねこ",
    rightsType: "LICENSED",
  },
  {
    slug: "you-and-i-are-polar-opposites",
    title: { en: "You and I Are Polar Opposites", "zh-Hant": "相反的你和我" },
    originalTitle: "正反対な君と僕",
    rightsType: "LICENSED",
  },
  {
    slug: "the-ghost-in-the-shell",
    title: { en: "THE GHOST IN THE SHELL", "zh-Hant": "攻殼機動隊 THE GHOST IN THE SHELL" },
    originalTitle: "攻殻機動隊 THE GHOST IN THE SHELL",
    rightsType: "LICENSED",
  },
  {
    slug: "frieren",
    title: { en: "Frieren: Beyond Journey's End", "zh-Hant": "葬送的芙莉蓮" },
    originalTitle: "葬送のフリーレン",
    rightsType: "LICENSED",
  },
  {
    slug: "bocchi-the-rock",
    title: { en: "BOCCHI THE ROCK!", "zh-Hant": "孤獨搖滾！" },
    originalTitle: "ぼっち・ざ・ろっく！",
    rightsType: "LICENSED",
  },
  {
    slug: "oshi-no-ko",
    title: { en: "OSHI NO KO", "zh-Hant": "【我推的孩子】" },
    originalTitle: "【推しの子】",
    rightsType: "LICENSED",
  },
];

type CharacterInput = Omit<CatalogCharacterV2, "id" | "market" | "authoritativeSource"> & {
  basePrice: number;
  campaignGoal?: number;
  sourceKind?: CatalogCharacterV2["authoritativeSource"]["kind"];
  sourceLabel?: string;
  sourceUrl?: string;
};

function character(input: CharacterInput): CatalogCharacterV2 {
  const {
    basePrice,
    campaignGoal = 500,
    sourceKind = "OFFICIAL_CHARACTER_PAGE",
    sourceLabel = "Official anime character page",
    sourceUrl,
    ...content
  } = input;

  return {
    ...content,
    id: `catalog-v2-${content.slug}`,
    market: { basePrice, priceStep: 2, unitsPerStep: 25, campaignGoal },
    authoritativeSource: {
      kind: sourceKind,
      label: sourceLabel,
      url: sourceUrl ?? null,
      retrievedAt,
    },
  };
}

export const catalogCharactersV2: CatalogCharacterV2[] = [
  character({
    slug: "akari-hoshino",
    seriesSlug: "starlit-cadence",
    name: { en: "Akari Hoshino", "zh-Hant": "星野燈里" },
    originalName: "星野あかり",
    headline: { en: "Signal Captain", "zh-Hant": "閃耀訊號隊長" },
    summary: {
      en: "An open-hearted center vocalist who turns every stage into a promise that tomorrow can sparkle.",
      "zh-Hant": "以坦率笑容帶領舞台的中心主唱，讓每次應援都成為明天仍會閃耀的約定。",
    },
    fandomPrompt: { en: "Support radiant comebacks and generous leadership.", "zh-Hant": "為燦爛的再起與溫柔的領導力應援。" },
    tags: { en: ["idol", "optimist", "leader"], "zh-Hant": ["偶像", "樂觀", "領袖"] },
    comfortStyle: { en: "Bright encouragement", "zh-Hant": "明亮鼓勵" },
    releaseSeason: "Platform original",
    basePrice: 20,
    campaignGoal: 800,
    sourceKind: "PLATFORM_ORIGINAL",
    sourceLabel: "ACG Polymarket original character",
  }),
  character({
    slug: "ren-tsukishiro",
    seriesSlug: "starlit-cadence",
    name: { en: "Ren Tsukishiro", "zh-Hant": "月城蓮" },
    originalName: "月城蓮",
    headline: { en: "Tactical Composer", "zh-Hant": "戰術作曲家" },
    summary: {
      en: "A quiet composer who reads a room carefully and makes every supporter feel heard.",
      "zh-Hant": "安靜細膩的作曲家，總能讀懂現場情緒，讓每位支持者都感到被聽見。",
    },
    fandomPrompt: { en: "Support calm confidence and late-night melodies.", "zh-Hant": "為沉著自信與深夜旋律應援。" },
    tags: { en: ["composer", "strategist", "calm"], "zh-Hant": ["作曲", "策略", "沉靜"] },
    comfortStyle: { en: "Quiet companionship", "zh-Hant": "安靜陪伴" },
    releaseSeason: "Platform original",
    basePrice: 18,
    campaignGoal: 650,
    sourceKind: "PLATFORM_ORIGINAL",
    sourceLabel: "ACG Polymarket original character",
  }),
  character({
    slug: "mira-kagetsu",
    seriesSlug: "starlit-cadence",
    name: { en: "Mira Kagetsu", "zh-Hant": "花月米菈" },
    originalName: "花月ミラ",
    headline: { en: "Wildcard Dancer", "zh-Hant": "驚喜舞者" },
    summary: {
      en: "A playful choreographer who celebrates collecting many favorites without turning affection into rivalry.",
      "zh-Hant": "充滿玩心的編舞者，相信喜歡多個角色不需要競爭，也能一起大聲慶祝。",
    },
    fandomPrompt: { en: "Support playful energy and surprise drops.", "zh-Hant": "為俏皮能量與驚喜掉落應援。" },
    tags: { en: ["dance", "wildcard", "collector"], "zh-Hant": ["舞蹈", "驚喜", "收藏"] },
    comfortStyle: { en: "Playful distraction", "zh-Hant": "俏皮轉換心情" },
    releaseSeason: "Platform original",
    basePrice: 16,
    campaignGoal: 600,
    sourceKind: "PLATFORM_ORIGINAL",
    sourceLabel: "ACG Polymarket original character",
  }),
  character({
    slug: "yatogami-tohka",
    seriesSlug: "date-a-live",
    name: { en: "Yatogami Tohka", "zh-Hant": "夜刀神十香" },
    originalName: "夜刀神十香",
    headline: { en: "Princess of honest affection", "zh-Hant": "坦率真心的公主" },
    summary: { en: "A sincere Spirit whose appetite, courage, and direct affection bring bright momentum.", "zh-Hant": "真誠直率的精靈，以食慾、勇氣與毫不掩飾的感情帶來明亮活力。" },
    fandomPrompt: { en: "Support wholehearted courage and honest joy.", "zh-Hant": "為全心全意的勇氣與純粹喜悅應援。" },
    tags: { en: ["spirit", "bright", "heroine"], "zh-Hant": ["精靈", "開朗", "女主角"] },
    comfortStyle: { en: "Direct reassurance", "zh-Hant": "直接安心" },
    releaseSeason: "2013 Spring",
    basePrice: 20,
    campaignGoal: 900,
    sourceUrl: "https://date-a-live5th-anime.com/character/tohka.php",
  }),
  character({
    slug: "tokisaki-kurumi",
    seriesSlug: "date-a-live",
    name: { en: "Tokisaki Kurumi", "zh-Hant": "時崎狂三" },
    originalName: "時崎狂三",
    headline: { en: "Midnight timekeeper", "zh-Hant": "午夜時間守望者" },
    summary: { en: "A theatrical Spirit with time-bending power, gothic poise, and an unreadable purpose.", "zh-Hant": "操縱時間、舉止優雅而目的難測的精靈，帶著濃厚哥德氣息。" },
    fandomPrompt: { en: "Support mystery, composure, and midnight style.", "zh-Hant": "為神祕、從容與午夜美學應援。" },
    tags: { en: ["spirit", "gothic", "mystery"], "zh-Hant": ["精靈", "哥德", "神祕"] },
    comfortStyle: { en: "Velvet-voiced calm", "zh-Hant": "絲絨般沉靜" },
    releaseSeason: "2013 Spring",
    basePrice: 23,
    campaignGoal: 1200,
    sourceUrl: "https://date-a-live5th-anime.com/character/kurumi.php",
  }),
  character({
    slug: "itsuka-kotori",
    seriesSlug: "date-a-live",
    name: { en: "Itsuka Kotori", "zh-Hant": "五河琴里" },
    originalName: "五河琴里",
    headline: { en: "Caring commander", "zh-Hant": "溫柔司令官" },
    summary: { en: "A decisive commander who supports the Spirits' daily lives while wishing for their happiness.", "zh-Hant": "果斷的司令官，也細心照顧精靈們的日常，真心盼望所有人幸福。" },
    fandomPrompt: { en: "Support dependable care and fiery resolve.", "zh-Hant": "為可靠照顧與火焰般決心應援。" },
    tags: { en: ["commander", "sister", "fire"], "zh-Hant": ["司令", "妹妹", "火焰"] },
    comfortStyle: { en: "Practical encouragement", "zh-Hant": "務實鼓勵" },
    releaseSeason: "2013 Spring",
    basePrice: 19,
    campaignGoal: 750,
    sourceUrl: "https://date-a-live5th-anime.com/character/kotori.php",
  }),
  character({
    slug: "tobiichi-origami",
    seriesSlug: "date-a-live",
    name: { en: "Tobiichi Origami", "zh-Hant": "鳶一折紙" },
    originalName: "鳶一折紙",
    headline: { en: "Precise angel", "zh-Hant": "精準天使" },
    summary: { en: "A brilliant, athletic perfectionist whose intense focus conceals a deeply personal history.", "zh-Hant": "文武兼備、追求精準的少女，強烈專注背後藏著非常私人的過往。" },
    fandomPrompt: { en: "Support precision, resilience, and quiet devotion.", "zh-Hant": "為精準、韌性與沉默專情應援。" },
    tags: { en: ["angel", "precision", "cool"], "zh-Hant": ["天使", "精準", "冷靜"] },
    comfortStyle: { en: "Structured grounding", "zh-Hant": "有條理的安定" },
    releaseSeason: "2013 Spring",
    basePrice: 19,
    campaignGoal: 760,
    sourceUrl: "https://date-a-live5th-anime.com/character/origami.php",
  }),
  character({
    slug: "yoshino-himekawa",
    seriesSlug: "date-a-live",
    name: { en: "Yoshino", "zh-Hant": "四糸乃" },
    originalName: "四糸乃",
    headline: { en: "Gentle hermit", "zh-Hant": "溫柔隱者" },
    summary: { en: "A shy and kind Spirit accompanied by the lively puppet Yoshinon.", "zh-Hant": "害羞而善良的精靈，總與活潑的手偶四糸奈一起行動。" },
    fandomPrompt: { en: "Support gentle courage and soft-spoken warmth.", "zh-Hant": "為溫柔勇氣與輕聲暖意應援。" },
    tags: { en: ["spirit", "gentle", "ice"], "zh-Hant": ["精靈", "溫柔", "冰雪"] },
    comfortStyle: { en: "Soft reassurance", "zh-Hant": "輕柔安心" },
    releaseSeason: "2013 Spring",
    basePrice: 18,
    campaignGoal: 700,
    sourceUrl: "https://date-a-live5th-anime.com/character/yoshino.php",
  }),
  character({
    slug: "rudeus-greyrat",
    seriesSlug: "mushoku-tensei",
    name: { en: "Rudeus Greyrat", "zh-Hant": "魯迪烏斯・格雷拉特" },
    originalName: "ルーデウス・グレイラット",
    headline: { en: "Second-chance mage", "zh-Hant": "重啟人生的魔術師" },
    summary: { en: "A talented mage determined to take his second life seriously and keep learning through failure.", "zh-Hant": "天賦出眾的魔術師，決心認真活過第二次人生，並從失敗中持續成長。" },
    fandomPrompt: { en: "Support perseverance and imperfect growth.", "zh-Hant": "為堅持與不完美的成長應援。" },
    tags: { en: ["mage", "adventure", "growth"], "zh-Hant": ["魔術師", "冒險", "成長"] },
    comfortStyle: { en: "Try-again motivation", "zh-Hant": "重新嘗試的動力" },
    releaseSeason: "2026 Summer",
    basePrice: 19,
    campaignGoal: 850,
    sourceUrl: "https://mushokutensei.jp/character/",
  }),
  character({
    slug: "sylphiette",
    seriesSlug: "mushoku-tensei",
    name: { en: "Sylphiette", "zh-Hant": "希露菲葉特" },
    originalName: "シルフィエット",
    headline: { en: "Steadfast wind", "zh-Hant": "堅定微風" },
    summary: { en: "Rudeus's childhood friend, a gifted mage whose gentle manner is backed by steady resolve.", "zh-Hant": "魯迪烏斯的兒時好友，溫柔態度背後有著堅定意志與優秀魔法才能。" },
    fandomPrompt: { en: "Support patient devotion and dependable warmth.", "zh-Hant": "為耐心守候與可靠暖意應援。" },
    tags: { en: ["mage", "elf", "gentle"], "zh-Hant": ["魔術師", "精靈族", "溫柔"] },
    comfortStyle: { en: "Patient companionship", "zh-Hant": "耐心陪伴" },
    releaseSeason: "2026 Summer",
    basePrice: 18,
    campaignGoal: 760,
    sourceUrl: "https://mushokutensei.jp/character/",
  }),
  character({
    slug: "roxy-migurdia",
    seriesSlug: "mushoku-tensei",
    name: { en: "Roxy Migurdia", "zh-Hant": "洛琪希・米格路迪亞" },
    originalName: "ロキシー・ミグルディア",
    headline: { en: "Blue-haired mentor", "zh-Hant": "藍髮導師" },
    summary: { en: "A skilled Migurd mage and formative teacher whose curiosity opens the world for her student.", "zh-Hant": "技藝高超的米格路德族魔術師，也是讓學生勇敢走向世界的重要導師。" },
    fandomPrompt: { en: "Support wisdom, curiosity, and mentor energy.", "zh-Hant": "為智慧、好奇心與導師力量應援。" },
    tags: { en: ["mentor", "mage", "adventure"], "zh-Hant": ["導師", "魔術師", "冒險"] },
    comfortStyle: { en: "Grounded guidance", "zh-Hant": "踏實引導" },
    releaseSeason: "2026 Summer",
    basePrice: 20,
    campaignGoal: 830,
    sourceUrl: "https://mushokutensei.jp/character/",
  }),
  character({
    slug: "sasaki",
    seriesSlug: "smoking-behind-the-supermarket",
    name: { en: "Sasaki", "zh-Hant": "佐佐木" },
    originalName: "佐々木",
    headline: { en: "Weary but considerate regular", "zh-Hant": "疲憊卻體貼的常客" },
    summary: { en: "A worn-down office worker who finds a small nightly refuge behind his local supermarket.", "zh-Hant": "疲憊的上班族，在常去超市的後方找到一段小小的夜間喘息。" },
    fandomPrompt: { en: "Support everyday kindness and quiet recovery.", "zh-Hant": "為日常善意與安靜復原應援。" },
    tags: { en: ["adult", "slice-of-life", "quiet"], "zh-Hant": ["大人系", "日常", "安靜"] },
    comfortStyle: { en: "After-work decompression", "zh-Hant": "下班後放鬆" },
    releaseSeason: "2026 Summer",
    basePrice: 15,
    campaignGoal: 500,
    sourceKind: "OFFICIAL_SERIES_PAGE",
    sourceLabel: "Official Square Enix series page",
    sourceUrl: "https://magazine.jp.square-enix.com/biggangan/introduction/yanisuu/",
  }),
  character({
    slug: "yamada-tayama",
    seriesSlug: "smoking-behind-the-supermarket",
    name: { en: "Yamada / Tayama", "zh-Hant": "山田／田山" },
    originalName: "山田／田山",
    headline: { en: "Two moods, one refuge", "zh-Hant": "兩種氣質，同一處避風港" },
    summary: { en: "A bright cashier whose off-duty Tayama persona teases Sasaki into a more honest kind of rest.", "zh-Hant": "親切店員山田在下班後以田山的姿態出現，用調皮交流讓佐佐木真正放鬆。" },
    fandomPrompt: { en: "Support playful honesty and grown-up companionship.", "zh-Hant": "為俏皮坦率與成熟陪伴應援。" },
    tags: { en: ["adult", "dual-persona", "teasing"], "zh-Hant": ["大人系", "雙重形象", "捉弄"] },
    comfortStyle: { en: "Wry companionship", "zh-Hant": "帶點吐槽的陪伴" },
    releaseSeason: "2026 Summer",
    basePrice: 17,
    campaignGoal: 620,
    sourceKind: "OFFICIAL_SERIES_PAGE",
    sourceLabel: "Official Square Enix series page",
    sourceUrl: "https://magazine.jp.square-enix.com/biggangan/introduction/yanisuu/",
  }),
  character({
    slug: "yani-neko",
    seriesSlug: "yani-neko",
    name: { en: "Yani Neko", "zh-Hant": "菸癮貓" },
    originalName: "ヤニねこ",
    headline: { en: "Chaotic cat neighbor", "zh-Hant": "混沌系貓鄰居" },
    summary: { en: "A messy, impulsive cat-person whose troublesome daily life still lands on strangely lovable beats.", "zh-Hant": "生活凌亂又衝動的貓獸人，麻煩日常卻總在奇妙之處顯得可愛。" },
    fandomPrompt: { en: "Support chaotic comedy without glorifying smoking.", "zh-Hant": "為混沌喜劇應援，但不美化吸菸。" },
    tags: { en: ["comedy", "kemonomimi", "chaos"], "zh-Hant": ["喜劇", "獸耳", "混沌"] },
    comfortStyle: { en: "Absurd comic relief", "zh-Hant": "荒謬喜劇轉換" },
    releaseSeason: "2026 Summer",
    basePrice: 15,
    campaignGoal: 500,
    sourceKind: "OFFICIAL_SERIES_PAGE",
    sourceLabel: "Official TV anime site character section",
    sourceUrl: "https://yanineko-anime.com/",
  }),
  character({
    slug: "miyu-suzuki",
    seriesSlug: "you-and-i-are-polar-opposites",
    name: { en: "Miyu Suzuki", "zh-Hant": "鈴木美優" },
    originalName: "鈴木みゆ",
    headline: { en: "Bright overthinker", "zh-Hant": "開朗的多想少女" },
    summary: { en: "An energetic girl who worries about others' opinions but tries to face her feelings sincerely.", "zh-Hant": "充滿活力卻在意他人眼光的少女，仍努力誠實面對自己的感情。" },
    fandomPrompt: { en: "Support honest self-expression and brave first steps.", "zh-Hant": "為坦率表達與勇敢踏出第一步應援。" },
    tags: { en: ["romance", "energetic", "school"], "zh-Hant": ["戀愛", "活力", "校園"] },
    comfortStyle: { en: "Cheerful validation", "zh-Hant": "開朗肯定" },
    releaseSeason: "2026 Winter",
    basePrice: 17,
    campaignGoal: 650,
    sourceUrl: "https://sh-anime.shochiku.co.jp/seihantai_anime/en/character/suzuki",
  }),
  character({
    slug: "yusuke-tani",
    seriesSlug: "you-and-i-are-polar-opposites",
    name: { en: "Yusuke Tani", "zh-Hant": "谷悠介" },
    originalName: "谷悠介",
    headline: { en: "Quietly straightforward", "zh-Hant": "安靜而坦率" },
    summary: { en: "A reserved boy who speaks his mind and slowly learns new emotional rhythms beside Suzuki.", "zh-Hant": "寡言卻敢於說出想法的少年，在鈴木身邊逐漸理解新的情感節奏。" },
    fandomPrompt: { en: "Support sincerity and steady emotional growth.", "zh-Hant": "為真誠與穩定的情感成長應援。" },
    tags: { en: ["romance", "quiet", "school"], "zh-Hant": ["戀愛", "寡言", "校園"] },
    comfortStyle: { en: "Plainspoken grounding", "zh-Hant": "直白安定" },
    releaseSeason: "2026 Winter",
    basePrice: 16,
    campaignGoal: 580,
    sourceUrl: "https://sh-anime.shochiku.co.jp/seihantai_anime/en/character/%E8%B0%B7",
  }),
  character({
    slug: "motoko-kusanagi",
    seriesSlug: "the-ghost-in-the-shell",
    name: { en: "Motoko Kusanagi", "zh-Hant": "草薙素子" },
    originalName: "草薙素子",
    headline: { en: "Shell Squad commander", "zh-Hant": "攻殼部隊指揮官" },
    summary: { en: "A full-body cyborg with exceptional combat and cyberbrain skills who commands the Shell Squad.", "zh-Hant": "具備卓越戰鬥與電腦腦技能的全身義體人，率領攻殼部隊執行任務。" },
    fandomPrompt: { en: "Support lucid leadership and cyberpunk resolve.", "zh-Hant": "為清醒領導力與賽博龐克決心應援。" },
    tags: { en: ["cyberpunk", "commander", "cyborg"], "zh-Hant": ["賽博龐克", "指揮官", "義體"] },
    comfortStyle: { en: "Focused grounding", "zh-Hant": "專注安定" },
    releaseSeason: "2026 Summer",
    basePrice: 22,
    campaignGoal: 950,
    sourceUrl: "https://www.theghostintheshell-anime.jp/en/character/motoko-kusanagi/",
  }),
  character({
    slug: "frieren",
    seriesSlug: "frieren",
    name: { en: "Frieren", "zh-Hant": "芙莉蓮" },
    originalName: "フリーレン",
    headline: { en: "Mage beyond time", "zh-Hant": "跨越時光的魔法使" },
    summary: { en: "A long-lived elven mage learning to understand people after the end of a great journey.", "zh-Hant": "長壽的精靈魔法使，在大冒險結束後重新踏上理解人類的旅程。" },
    fandomPrompt: { en: "Support quiet wonder, memory, and patient discovery.", "zh-Hant": "為安靜奇想、回憶與耐心探索應援。" },
    tags: { en: ["mage", "elf", "journey"], "zh-Hant": ["魔法使", "精靈", "旅程"] },
    comfortStyle: { en: "Timeless perspective", "zh-Hant": "悠長視角" },
    releaseSeason: "2023 Autumn",
    basePrice: 24,
    campaignGoal: 1300,
    sourceUrl: "https://frieren-anime.jp/character/chara_group1/1-1/",
  }),
  character({
    slug: "fern",
    seriesSlug: "frieren",
    name: { en: "Fern", "zh-Hant": "費倫" },
    originalName: "フェルン",
    headline: { en: "Steady young mage", "zh-Hant": "穩重的年輕魔法使" },
    summary: { en: "Frieren's disciplined apprentice, an exceptional mage who quietly keeps the party grounded.", "zh-Hant": "芙莉蓮自律出色的徒弟，也總以細膩方式讓旅伴保持安定。" },
    fandomPrompt: { en: "Support discipline, warmth, and understated strength.", "zh-Hant": "為自律、暖意與含蓄力量應援。" },
    tags: { en: ["mage", "disciplined", "gentle"], "zh-Hant": ["魔法使", "自律", "溫柔"] },
    comfortStyle: { en: "Dependable routine", "zh-Hant": "可靠日常" },
    releaseSeason: "2023 Autumn",
    basePrice: 21,
    campaignGoal: 900,
    sourceUrl: "https://frieren-anime.jp/character/chara_group1/1-5/",
  }),
  character({
    slug: "hitori-gotoh",
    seriesSlug: "bocchi-the-rock",
    name: { en: "Hitori Gotoh", "zh-Hant": "後藤一里" },
    originalName: "後藤ひとり",
    headline: { en: "Bedroom guitar hero", "zh-Hant": "房間裡的吉他英雄" },
    summary: { en: "A highly skilled guitarist with severe social anxiety who searches for a place to shine in a band.", "zh-Hant": "吉他實力出眾卻極度怕生的少女，努力在樂團中找到能夠發光的位置。" },
    fandomPrompt: { en: "Support small social victories and honest creativity.", "zh-Hant": "為每次社交小勝利與真誠創作應援。" },
    tags: { en: ["guitar", "anxious", "creative"], "zh-Hant": ["吉他", "社恐", "創作"] },
    comfortStyle: { en: "Anxiety solidarity", "zh-Hant": "社恐共感" },
    releaseSeason: "2022 Autumn",
    basePrice: 23,
    campaignGoal: 1150,
    sourceUrl: "https://bocchi.rocks/tv/character/hitori.html",
  }),
  character({
    slug: "nijika-ijichi",
    seriesSlug: "bocchi-the-rock",
    name: { en: "Nijika Ijichi", "zh-Hant": "伊地知虹夏" },
    originalName: "伊地知虹夏",
    headline: { en: "Band's sunny heartbeat", "zh-Hant": "樂團的陽光心跳" },
    summary: { en: "The cheerful drummer and organizer whose care gives Kessoku Band a welcoming center.", "zh-Hant": "開朗的鼓手與樂團核心，以細心照顧為團結樂團創造溫暖中心。" },
    fandomPrompt: { en: "Support generous teamwork and sunny momentum.", "zh-Hant": "為慷慨合作與陽光動力應援。" },
    tags: { en: ["drums", "leader", "cheerful"], "zh-Hant": ["鼓手", "領袖", "開朗"] },
    comfortStyle: { en: "Sunny encouragement", "zh-Hant": "陽光鼓勵" },
    releaseSeason: "2022 Autumn",
    basePrice: 21,
    campaignGoal: 900,
    sourceUrl: "https://bocchi.rocks/tv/character/nijika.html",
  }),
  character({
    slug: "ruby-hoshino",
    seriesSlug: "oshi-no-ko",
    name: { en: "Ruby Hoshino", "zh-Hant": "星野露比" },
    originalName: "星野ルビー",
    headline: { en: "Dream-chasing idol", "zh-Hant": "追夢偶像" },
    summary: { en: "An aspiring idol carrying memories of a former life and a fierce wish to reach the stage.", "zh-Hant": "懷抱前世記憶與強烈舞台夢想的偶像少女，不斷朝母親曾站過的高度前進。" },
    fandomPrompt: { en: "Support resilient dreams and stage-bright hope.", "zh-Hant": "為堅韌夢想與舞台希望應援。" },
    tags: { en: ["idol", "dreamer", "energetic"], "zh-Hant": ["偶像", "夢想", "活力"] },
    comfortStyle: { en: "Hopeful cheering", "zh-Hant": "希望應援" },
    releaseSeason: "2023 Spring",
    basePrice: 22,
    campaignGoal: 1050,
    sourceUrl: "https://ichigoproduction.com/Season3/chara/ruby.html",
  }),
  character({
    slug: "kana-arima",
    seriesSlug: "oshi-no-ko",
    name: { en: "Kana Arima", "zh-Hant": "有馬佳奈" },
    originalName: "有馬かな",
    headline: { en: "Adaptive performer", "zh-Hant": "懂得配合的表演者" },
    summary: { en: "A former child prodigy who keeps adapting as an actor and idol without giving up her pride in performance.", "zh-Hant": "曾是天才童星，在演員與偶像道路上不斷調整自己，仍守住對表演的自尊。" },
    fandomPrompt: { en: "Support perseverance, craft, and hard-earned confidence.", "zh-Hant": "為堅持、專業與得來不易的自信應援。" },
    tags: { en: ["actor", "idol", "tsundere"], "zh-Hant": ["演員", "偶像", "傲嬌"] },
    comfortStyle: { en: "Tough-love validation", "zh-Hant": "嘴硬心軟的肯定" },
    releaseSeason: "2023 Spring",
    basePrice: 22,
    campaignGoal: 1000,
    sourceUrl: "https://ichigoproduction.com/Season3/chara/kana.html",
  }),
  character({
    slug: "mem-cho",
    seriesSlug: "oshi-no-ko",
    name: { en: "MEM-cho", "zh-Hant": "MEM啾" },
    originalName: "MEMちょ",
    headline: { en: "Social media spark", "zh-Hant": "社群活力核心" },
    summary: { en: "A popular creator who brings practical media instincts, energy, and care to B-Komachi.", "zh-Hant": "人氣創作者，以務實媒體直覺、旺盛活力與細心照顧支撐新生B小町。" },
    fandomPrompt: { en: "Support creator savvy and irrepressible energy.", "zh-Hant": "為創作者智慧與停不下來的能量應援。" },
    tags: { en: ["creator", "idol", "social-media"], "zh-Hant": ["創作者", "偶像", "社群媒體"] },
    comfortStyle: { en: "Upbeat pep talk", "zh-Hant": "活力打氣" },
    releaseSeason: "2023 Spring",
    basePrice: 20,
    campaignGoal: 850,
    sourceUrl: "https://ichigoproduction.com/Season3/chara/memcho.html",
  }),
];

export function validateCatalogV2(characters: readonly CatalogCharacterV2[] = catalogCharactersV2): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const seriesSlugs = new Set(catalogSeriesV2.map((series) => series.slug));

  if (characters.length !== 24) errors.push(`Catalog must contain exactly 24 characters; received ${characters.length}.`);

  for (const entry of characters) {
    if (ids.has(entry.id)) errors.push(`Duplicate character id: ${entry.id}.`);
    if (slugs.has(entry.slug)) errors.push(`Duplicate character slug: ${entry.slug}.`);
    ids.add(entry.id);
    slugs.add(entry.slug);

    if (!seriesSlugs.has(entry.seriesSlug)) errors.push(`Unknown series ${entry.seriesSlug} for ${entry.slug}.`);
    if (!entry.name.en.trim() || !entry.name["zh-Hant"].trim()) errors.push(`${entry.slug} is missing a localized name.`);
    if (!entry.summary.en.trim() || !entry.summary["zh-Hant"].trim()) errors.push(`${entry.slug} is missing a localized summary.`);
    if (!entry.tags.en.length || !entry.tags["zh-Hant"].length) errors.push(`${entry.slug} is missing localized tags.`);
    if (entry.authoritativeSource.kind !== "PLATFORM_ORIGINAL" && !entry.authoritativeSource.url?.startsWith("https://")) {
      errors.push(`${entry.slug} requires an authoritative HTTPS source.`);
    }
  }

  return errors;
}
