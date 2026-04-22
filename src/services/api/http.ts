import axios from 'axios';

/**
 * Shared axios instance. Base URL points at the public BSUIR API.
 * Note: the API does not require authentication for public schedule endpoints.
 *
 * `adapter: 'fetch'` — uses the native fetch API instead of XMLHttpRequest.
 * RN dev tools intercept XMLHttpRequest (network inspector / bridge), which
 * causes 15 s timeouts on older iOS and Android dev builds.  Native fetch
 * bypasses this entirely.
 */
export const http = axios.create({
  baseURL: 'https://iis.bsuir.by/api/v1',
  timeout: 15_000,
  adapter: 'fetch',
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
