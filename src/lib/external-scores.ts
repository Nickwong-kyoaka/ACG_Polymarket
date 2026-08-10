export interface ExternalScoreInput {
  source: string;
  score: number;
  scale: number;
  voteCount?: number;
}

export interface NormalizedExternalScore {
  source: string;
  normalizedScore: number;
  confidence: "low" | "medium" | "high";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function confidenceFromVotes(voteCount: number | undefined): NormalizedExternalScore["confidence"] {
  if (typeof voteCount !== "number" || voteCount < 100) {
    return "low";
  }

  if (voteCount < 1000) {
    return "medium";
  }

  return "high";
}

export function normalizeExternalScore(input: ExternalScoreInput): NormalizedExternalScore {
  if (!Number.isFinite(input.score) || !Number.isFinite(input.scale) || input.scale <= 0) {
    throw new Error("External score and scale must be finite positive numbers.");
  }

  const score = clamp(input.score, 0, input.scale);
  const normalizedScore = Math.round((score / input.scale) * 1000) / 10;

  return {
    source: input.source.trim(),
    normalizedScore,
    confidence: confidenceFromVotes(input.voteCount),
  };
}

export function normalizeExternalScores(inputs: readonly ExternalScoreInput[]) {
  return inputs.map(normalizeExternalScore).sort((left, right) => {
    if (right.normalizedScore !== left.normalizedScore) {
      return right.normalizedScore - left.normalizedScore;
    }

    return left.source.localeCompare(right.source);
  });
}
