import axios, { type AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { AuditoryIndexDto } from '@models/dto';

/**
 * URL of the deployed Cloudflare Worker (see `services/auditory-api/README.md`).
 * Configured via `EXPO_PUBLIC_AUDITORY_API_URL` in `.env` (surfaced as
 * `expo.extra.auditoryApiUrl` by `app.config.ts`); empty string disables the
 * whole feature (controller treats missing URL as "no data").
 */
const getWorkerUrl = (): string => {
  const extras = Constants.expoConfig?.extra as { auditoryApiUrl?: string } | undefined;
  return (extras?.auditoryApiUrl ?? '').replace(/\/$/, '');
};

let _client: AxiosInstance | null = null;

const getClient = (): AxiosInstance | null => {
  const baseURL = getWorkerUrl();
  if (!baseURL) return null;
  if (_client) return _client;
  _client = axios.create({
    baseURL,
    timeout: 20_000,
    adapter: Platform.OS === 'android' ? 'xhr' : 'fetch',
    headers: { Accept: 'application/json' },
  });
  return _client;
};

export const AuditoryApi = {
  /** Whether the auditory-api URL is configured (i.e. feature is enabled). */
  isConfigured(): boolean {
    return getWorkerUrl().length > 0;
  },

  /** GET /index — full occupancy index. */
  async fetchIndex(): Promise<AuditoryIndexDto | null> {
    const client = getClient();
    if (!client) return null;
    const { data } = await client.get<AuditoryIndexDto>('/index');
    return data;
  },
};
