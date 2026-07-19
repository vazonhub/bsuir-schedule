import { Platform } from 'react-native';

import { getAccessToken } from './googleAuth';

/**
 * Google Drive `appDataFolder` KV store — Android equivalent of iCloud KV Store.
 *
 * Each key maps to a small JSON file in the hidden app-only folder.
 * All operations are best-effort and silently fail, mirroring iCloud behaviour.
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

/** In-memory cache: sanitised file name → Drive file ID. */
const fileIdCache = new Map<string, string>();

/** True if Google Drive sync can potentially work on this platform. */
export const isGoogleDriveAvailable = Platform.OS === 'android';

// ── Helpers ──

const sanitiseKey = (key: string): string => key.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

/**
 * Find the Drive file ID for a given key. Uses cache, falls back to list query.
 * Returns `null` if not found.
 */
const resolveFileId = async (key: string, token: string): Promise<string | null> => {
  const name = sanitiseKey(key);
  const cached = fileIdCache.get(name);
  if (cached) return cached;

  const q = encodeURIComponent(`name='${name}'`);
  const url = `${DRIVE_API}?spaces=appDataFolder&q=${q}&fields=files(id)&pageSize=1`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) return null;

  const body = (await res.json()) as { files?: { id: string }[] };
  const id = body.files?.[0]?.id ?? null;
  if (id) fileIdCache.set(name, id);
  return id;
};

/**
 * Wrapper that retries once on 401 (expired token).
 */
const withRetry = async <T>(fn: (token: string) => Promise<T>): Promise<T | null> => {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    return await fn(token);
  } catch {
    // Retry once — token may have expired mid-request.
    const refreshed = await getAccessToken();
    if (!refreshed) return null;
    try {
      return await fn(refreshed);
    } catch {
      return null;
    }
  }
};

// ── Public API (mirrors icloud.ts) ──

/** Read a string value from Google Drive appDataFolder. */
export const googleDriveGet = async (key: string): Promise<string | null> => {
  if (!isGoogleDriveAvailable) return null;
  return withRetry(async (token) => {
    const fileId = await resolveFileId(key, token);
    if (!fileId) return null;

    const res = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    return res.text();
  });
};

/** Write a string value to Google Drive appDataFolder (upsert). */
export const googleDriveSet = async (key: string, value: string): Promise<void> => {
  if (!isGoogleDriveAvailable) return;
  await withRetry(async (token) => {
    const existingId = await resolveFileId(key, token);

    if (existingId) {
      // Update existing file.
      const res = await fetch(`${UPLOAD_API}/${existingId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          ...authHeaders(token),
          'Content-Type': 'application/json',
        },
        body: value,
      });
      if (!res.ok && res.status === 404) {
        // File was deleted externally — remove from cache and create.
        fileIdCache.delete(sanitiseKey(key));
        await createFile(key, value, token);
      }
    } else {
      await createFile(key, value, token);
    }
    return null;
  });
};

/** Remove a key from Google Drive appDataFolder. */
export const googleDriveRemove = async (key: string): Promise<void> => {
  if (!isGoogleDriveAvailable) return;
  await withRetry(async (token) => {
    const fileId = await resolveFileId(key, token);
    if (!fileId) return null;

    await fetch(`${DRIVE_API}/${fileId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    fileIdCache.delete(sanitiseKey(key));
    return null;
  });
};

/** Get all keys currently stored in Google Drive appDataFolder. */
export const googleDriveGetAllKeys = async (): Promise<string[]> => {
  if (!isGoogleDriveAvailable) return [];
  const result = await withRetry(async (token) => {
    const keys: string[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        spaces: 'appDataFolder',
        fields: 'nextPageToken,files(id,name)',
        pageSize: '100',
      });
      if (pageToken) params.set('pageToken', pageToken);

      const res = await fetch(`${DRIVE_API}?${params.toString()}`, {
        headers: authHeaders(token),
      });
      if (!res.ok) break;

      const body = (await res.json()) as {
        files?: { id: string; name: string }[];
        nextPageToken?: string;
      };

      for (const f of body.files ?? []) {
        fileIdCache.set(f.name, f.id);
        // Strip .json suffix to recover original key (with _ instead of special chars).
        keys.push(f.name.replace(/\.json$/, ''));
      }
      pageToken = body.nextPageToken;
    } while (pageToken);

    return keys;
  });
  return result ?? [];
};

// ── Internal ──

/** Create a new file in appDataFolder via multipart upload. */
const createFile = async (key: string, value: string, token: string): Promise<void> => {
  const name = sanitiseKey(key);
  const boundary = '---bsuirtime' + Date.now();
  const metadata = JSON.stringify({
    name,
    parents: ['appDataFolder'],
  });

  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    metadata +
    '\r\n' +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    value +
    '\r\n' +
    `--${boundary}--`;

  const res = await fetch(`${UPLOAD_API}?uploadType=multipart`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (res.ok) {
    const created = (await res.json()) as { id?: string };
    if (created.id) fileIdCache.set(name, created.id);
  }
};
