export interface BangumiImportSample {
  subjectId: string;
  subjectTitle: string;
  sourceUrl: string;
  releaseSeason: string;
  score?: number;
  rank?: number;
  popularity?: number;
  characters: Array<{
    id: string;
    name: string;
    slug: string;
    title: string;
    summary: string;
    fandomPrompt: string;
    tags: string[];
    favoritePhrase?: string;
    accentFrom: string;
    accentTo: string;
  }>;
}

export const bangumiImportSamples: BangumiImportSample[] = [
  {
    subjectId: "49131",
    subjectTitle: "デート・ア・ライブ",
    sourceUrl: "https://bangumi.tv/subject/49131",
    releaseSeason: "2013 Spring",
    score: 70,
    popularity: 28705,
    characters: [
      {
        id: "19525",
        name: "夜刀神十香",
        slug: "yatogami-tohka",
        title: "Princess support slot",
        summary:
          "Metadata-only Date A Live sample for a direct, warm heroine support route.",
        fandomPrompt:
          "Support Tohka if you love honest affection, huge appetite energy, and sword-bright courage.",
        tags: ["date-a-live", "spirit", "heroine", "comfort"],
        favoritePhrase: "Let me cheer for you with everything I have.",
        accentFrom: "#4c1d95",
        accentTo: "#c4b5fd",
      },
      {
        id: "19529",
        name: "時崎狂三",
        slug: "tokisaki-kurumi",
        title: "Nightmare support slot",
        summary:
          "Metadata-only Date A Live sample for gothic, velvet-voiced comfort and collector appeal.",
        fandomPrompt:
          "Support Kurumi if you love mysterious charm, theatrical calm, and midnight profile themes.",
        tags: ["date-a-live", "spirit", "gothic", "asmr"],
        favoritePhrase: "Your wounded heart can rest here for a little while.",
        accentFrom: "#111827",
        accentTo: "#b91c1c",
      },
    ],
  },
  {
    subjectId: "summer-2026-bangumi",
    subjectTitle: "Bangumi 2026 Summer Watchlist",
    sourceUrl: "https://bangumi.tv/anime/tag/2026%E5%A4%8F",
    releaseSeason: "2026 Summer",
    characters: [
      {
        id: "summer-mushoku-iii",
        name: "無職転生Ⅲ Support Signal",
        slug: "mushoku-tensei-iii-signal",
        title: "Summer 2026 high-support sample",
        summary:
          "A metadata-only seasonal support slot inspired by Bangumi's 2026 summer listings.",
        fandomPrompt:
          "Support this slot if you want current-season hype to sit beside safer original assets.",
        tags: ["2026-summer", "bangumi", "seasonal", "fantasy"],
        favoritePhrase: "A new season can still become a better chapter.",
        accentFrom: "#7c2d12",
        accentTo: "#fdba74",
      },
      {
        id: "summer-supermarket-smoking",
        name: "スーパーの裏でヤニ吸うふたり Signal",
        slug: "supermarket-smoking-signal",
        title: "Quiet adult-cast seasonal sample",
        summary:
          "A metadata-only slot for a gentle, conversational 2026 summer title.",
        fandomPrompt:
          "Support this slot if you like low-key tenderness, late shifts, and quiet chemistry.",
        tags: ["2026-summer", "slice-of-life", "romance", "adult-cast"],
        favoritePhrase: "Take one slow breath before you go back out there.",
        accentFrom: "#475569",
        accentTo: "#d6d3d1",
      },
      {
        id: "summer-yani-neko",
        name: "ヤニねこ Signal",
        slug: "yani-neko-signal",
        title: "Mascot chaos seasonal sample",
        summary:
          "A metadata-only slot for playful seasonal browsing and hot-list testing.",
        fandomPrompt:
          "Support this slot if your comfort language is weird jokes and chaotic cat energy.",
        tags: ["2026-summer", "comedy", "cat", "seasonal"],
        favoritePhrase: "Being strange is also a way to survive the day.",
        accentFrom: "#155e75",
        accentTo: "#a7f3d0",
      },
      {
        id: "summer-opposites",
        name: "正反対な君と僕 第2期 Signal",
        slug: "you-and-i-are-polar-opposites-s2-signal",
        title: "Romance momentum seasonal sample",
        summary:
          "A metadata-only support slot for a warm 2026 summer relationship title.",
        fandomPrompt:
          "Support this slot if you like opposites learning to stand beside each other.",
        tags: ["2026-summer", "romance", "school", "comfort"],
        favoritePhrase: "Different hearts can still move at the same pace.",
        accentFrom: "#be123c",
        accentTo: "#fecdd3",
      },
      {
        id: "summer-ghost-shell",
        name: "攻殻機動隊 THE GHOST IN THE SHELL Signal",
        slug: "ghost-in-the-shell-2026-signal",
        title: "Cyberpunk seasonal sample",
        summary:
          "A metadata-only support slot for a 2026 summer sci-fi reference entry.",
        fandomPrompt:
          "Support this slot if you want cyberpunk legacy titles visible in the beta market.",
        tags: ["2026-summer", "sci-fi", "cyberpunk", "classic"],
        favoritePhrase: "Even a wired soul deserves a soft landing.",
        accentFrom: "#0f172a",
        accentTo: "#38bdf8",
      },
    ],
  },
];
