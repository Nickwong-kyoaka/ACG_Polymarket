export type ComfortModeKey =
  | "lonely"
  | "stress"
  | "study_fatigue"
  | "sleep"
  | "low_confidence"
  | "heartbreak";

export interface ComfortMode {
  key: ComfortModeKey;
  label: string;
  tone: string;
  keywords: readonly string[];
}

export interface ComfortModeMatchInput {
  need?: string;
  tags?: readonly string[];
  localHour?: number;
}

export interface ComfortModeMatch {
  mode: ComfortMode;
  score: number;
  matchedKeywords: string[];
}

export const COMFORT_MODES: readonly ComfortMode[] = [
  {
    key: "lonely",
    label: "Warm companionship",
    tone: "gentle, present, reassuring",
    keywords: ["alone", "lonely", "empty", "miss", "company", "ignored", "孤單", "寂寞"],
  },
  {
    key: "stress",
    label: "Soft pressure release",
    tone: "slow, steady, grounding",
    keywords: ["stress", "panic", "anxious", "overwhelmed", "deadline", "pressure", "壓力", "焦慮"],
  },
  {
    key: "study_fatigue",
    label: "Study recharge",
    tone: "bright, focused, encouraging",
    keywords: ["study", "exam", "homework", "burnout", "focus", "tired", "讀書", "考試", "累"],
  },
  {
    key: "sleep",
    label: "Sleepy ASMR wind-down",
    tone: "hushed, cozy, low-energy",
    keywords: ["sleep", "insomnia", "night", "asmr", "rest", "dream", "睡", "失眠", "晚安"],
  },
  {
    key: "low_confidence",
    label: "Confidence refill",
    tone: "affirming, proud, protective",
    keywords: ["confidence", "fail", "worthless", "nervous", "small", "scared", "自信", "失敗"],
  },
  {
    key: "heartbreak",
    label: "Heart repair",
    tone: "tender, patient, emotionally safe",
    keywords: ["heartbreak", "breakup", "rejected", "cry", "hurt", "love", "失戀", "心碎"],
  },
];

function tokenize(values: readonly string[]) {
  return new Set(
    values
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter(Boolean),
  );
}

function isNightHour(hour: number | undefined) {
  return typeof hour === "number" && ((hour >= 22 && hour <= 23) || (hour >= 0 && hour <= 5));
}

function normalizeSlug(key: string) {
  return key.replaceAll("_", "-").replace(/^lonely$/, "loneliness");
}

function matchComfortModeResult(input: ComfortModeMatchInput): ComfortModeMatch {
  const haystack = [input.need ?? "", ...(input.tags ?? [])].join(" ").toLowerCase();
  const tokens = tokenize([haystack]);

  let bestMode = COMFORT_MODES[0];
  let bestScore = 0;
  let bestMatches: string[] = [];

  for (const mode of COMFORT_MODES) {
    const matchedKeywords = mode.keywords.filter(
      (keyword) => tokens.has(keyword.toLowerCase()) || haystack.includes(keyword.toLowerCase()),
    );
    let score = matchedKeywords.length * 2;

    if (mode.key === "sleep" && isNightHour(input.localHour)) {
      score += tokens.size === 0 ? 2 : 1;
    }

    if (score > bestScore) {
      bestMode = mode;
      bestScore = score;
      bestMatches = matchedKeywords;
    }
  }

  return {
    mode: bestMode,
    score: bestScore,
    matchedKeywords: bestMatches,
  };
}

export function matchComfortMode(
  input: ComfortModeMatchInput,
): ComfortModeMatch;
export function matchComfortMode(
  input: string,
  modes: Array<Pick<import("@/lib/types").ComfortMode, "slug">>,
): string;
export function matchComfortMode(
  input: ComfortModeMatchInput | string,
  modes?: Array<Pick<import("@/lib/types").ComfortMode, "slug">>,
) {
  if (typeof input !== "string") {
    return matchComfortModeResult(input);
  }

  const result = matchComfortModeResult({ need: input });
  const availableSlugs = modes?.map((mode) => mode.slug) ?? [];
  const matchedSlug = normalizeSlug(result.mode.key);

  if (availableSlugs.includes(matchedSlug)) {
    return matchedSlug;
  }

  return availableSlugs[0] ?? matchedSlug;
}
