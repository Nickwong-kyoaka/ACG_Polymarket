export interface ExchangeFeatureFlags {
  community: boolean;
  predictions: boolean;
  submissions: boolean;
}

type FeatureFlagEnvironment = {
  FEATURE_COMMUNITY?: string;
  FEATURE_PREDICTIONS?: string;
  FEATURE_SUBMISSIONS?: string;
};

export function parseFeatureFlag(value: string | undefined, fallback: boolean) {
  if (value === undefined || value.trim() === "") return fallback;
  return !["0", "false", "off", "no"].includes(value.trim().toLowerCase());
}

export function getExchangeFeatureFlags(
  env: FeatureFlagEnvironment = {
    FEATURE_COMMUNITY: process.env.FEATURE_COMMUNITY,
    FEATURE_PREDICTIONS: process.env.FEATURE_PREDICTIONS,
    FEATURE_SUBMISSIONS: process.env.FEATURE_SUBMISSIONS,
  },
): ExchangeFeatureFlags {
  return {
    community: parseFeatureFlag(env.FEATURE_COMMUNITY, true),
    predictions: parseFeatureFlag(env.FEATURE_PREDICTIONS, true),
    submissions: parseFeatureFlag(env.FEATURE_SUBMISSIONS, true),
  };
}
