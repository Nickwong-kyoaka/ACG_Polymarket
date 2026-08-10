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
    keywords: ["alone", "lonely", "empty", "miss", "company", "ignored"],
  },
  {
    key: "stress",
    label: "Soft pressure release",
    tone: "slow, steady, grounding",
    keywords: ["stress", "panic", "anxious", "overwhelmed", "deadline", "pressure"],
  },
  {
    key: "study_fatigue",
    label: "Study recharge",
    tone: "bright, focused, encouraging",
    keywords: ["study", "exam", "homework", "burnout", "focus", "tired"],
  },
  {
    key: "sleep",
    label: "Sleepy ASMR wind-down",
    tone: "hushed, cozy, low-energy",
    keywords: ["sleep", "insomnia", "night", "asmr", "rest", "dream"],
  },
  {
    key: "low_confidence",
    label: "Confidence refill",
    tone: "affirming, proud, protective",
    keywords: ["confidence", "fail", "worthless", "nervous", "small", "scared"],
  },
  {
    key: "heartbreak",
    label: "Heart repair",
    tone: "tender, patient, emotionally safe",
    keywords: ["heartbreak", "breakup", "rejected", "cry", "hurt", "love"],
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

export function matchComfortMode(input: ComfortModeMatchInput): ComfortModeMatch {
  const tokens = tokenize([input.need ?? "", ...(input.tags ?? [])]);

  let bestMode = COMFORT_MODES[0];
  let bestScore = 0;
  let bestMatches: string[] = [];

  for (const mode of COMFORT_MODES) {
    const matchedKeywords = mode.keywords.filter((keyword) => tokens.has(keyword));
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
