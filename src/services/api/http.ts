import axios from 'axios';
import { Platform } from 'react-native';

/**
 * Shared axios instance. Base URL points at the public BSUIR API.
 * Note: the API does not require authentication for public schedule endpoints.
 *
 * Adapter selection:
 * - iOS: `'fetch'` — bypasses RN dev tools XMLHttpRequest interception that
 *   causes 15 s timeouts in dev builds.
 * - Android: default (`'xhr'`) — Android's native fetch has known issues with
 *   DNS resolution, AbortController and SSL that cause immediate failures in
 *   production builds.  XMLHttpRequest works reliably on Android in production.
 */
export const http = axios.create({
  baseURL: 'https://iis.bsuir.by/api/v1',
  timeout: 15_000,
  adapter: Platform.OS === 'android' ? 'xhr' : 'fetch',
  headers: {
    Accept: 'application/json',
  },
});

if (__DEV__) {
  http.interceptors.response.use(undefined, (error) => {
    // Aborted = duplicate/stale request cancelled by fetch adapter; harmless.
    if (axios.isCancel(error) || error.message === 'Aborted') {
      return Promise.reject(error);
    }
    console.warn('[HTTP]', error.config?.url, error.message, error.code);
    return Promise.reject(error);
  });
}
