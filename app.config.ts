import type { ConfigContext, ExpoConfig } from 'expo/config';

const pkg = require('./package.json');

/**
 * Owner-specific identifiers are intentionally kept out of app.json — set them
 * in `.env` (see `.env.example`). Forks build fine without them: EAS fields are
 * only needed for cloud builds, and the auditory occupancy feature silently
 * no-ops when `EXPO_PUBLIC_AUDITORY_API_URL` is unset.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  return {
    ...base,
    version: pkg.version,
    ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
    extra: {
      ...base.extra,
      ...(process.env.EXPO_PUBLIC_AUDITORY_API_URL
        ? { auditoryApiUrl: process.env.EXPO_PUBLIC_AUDITORY_API_URL }
        : {}),
      eas: {
        ...(base.extra?.eas as Record<string, unknown> | undefined),
        ...(process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : {}),
      },
    },
  };
};
