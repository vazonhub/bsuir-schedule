import axios from 'axios';

/**
 * Shared axios instance. Base URL points at the public BSUIR API.
 * Note: the API does not require authentication for public schedule endpoints.
 */
export const http = axios.create({
  baseURL: 'https://iis.bsuir.by/api/v1',
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
  },
});

if (__DEV__) {
  http.interceptors.response.use(undefined, (error) => {
    console.warn('[HTTP]', error.config?.url, error.message, error.code);
    return Promise.reject(error);
  });

  // Quick fetch test — check if native networking works at all on Android.
  fetch('https://www.google.com')
    .then((r) => console.warn('[FETCH-GOOGLE] status:', r.status))
    .catch((e) => console.warn('[FETCH-GOOGLE] error:', e.message));

  fetch('https://iis.bsuir.by/api/v1/schedule/current-week')
    .then((r) => console.warn('[FETCH-BSUIR] status:', r.status))
    .catch((e) => console.warn('[FETCH-BSUIR] error:', e.message));
}
