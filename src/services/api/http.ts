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
