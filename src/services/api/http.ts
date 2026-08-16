import axios from 'axios';

/**
 * Shared axios instance. Base URL points at the public BSUIR API.
 * Note: the API does not require authentication for public schedule endpoints.
 *
 * Adapter selection — `['fetch', 'xhr']` on both platforms:
 * - `'fetch'` is tried first. It bypasses RN dev-tools XMLHttpRequest
 *   interception (the source of 15 s dev-build timeouts) and, on RN 0.81 +
 *   the New Architecture, is the only native path that reliably reaches the
 *   BSUIR API on Android — the previously-pinned `'xhr'` adapter started
 *   failing *every* request there (the server cert is a standard, Android-
 *   trusted GlobalSign chain, so this is a native-XHR issue, not TLS).
 * - `'xhr'` stays as an automatic fallback for any environment where the
 *   fetch adapter is reported as unsupported.
 */
export const http = axios.create({
  baseURL: 'https://iis.bsuir.by/api/v1',
  timeout: 15_000,
  adapter: ['fetch', 'xhr'],
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
