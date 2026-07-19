import { AuditoryApi } from '@services/api/auditory.api';
import { cache, TTL } from '@services/cache/cache';
import type { AuditoryIndexDto } from '@models/dto';

const CACHE_KEY = 'auditory-index-v1';
/** 24 h — matches the nightly crawl cadence. */
const INDEX_TTL = TTL.lists;

/** In-memory copy so repeated modal opens don't touch AsyncStorage. */
let inMemory: AuditoryIndexDto | null = null;
/** Deduplicate concurrent fetches (e.g. two modals opened quickly). */
let inFlight: Promise<AuditoryIndexDto | null> | null = null;

/**
 * Load the full auditory index. Stale-while-revalidate:
 * - cache hit → return immediately (no network)
 * - cache miss → fetch from Worker, persist, return
 * - fetch failure → return whatever is in-memory (may be null)
 *
 * Feature is silently no-op when `expo.extra.auditoryApiUrl` isn't set.
 */
async function ensureIndex(): Promise<AuditoryIndexDto | null> {
  if (!AuditoryApi.isConfigured()) return null;
  if (inMemory) return inMemory;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const cached = await cache.get<AuditoryIndexDto>(CACHE_KEY, INDEX_TTL);
      if (cached && cached.auditories && Object.keys(cached.auditories).length > 0) {
        inMemory = cached;
        return cached;
      }
      const fresh = await AuditoryApi.fetchIndex();
      if (fresh && fresh.auditories) {
        inMemory = fresh;
        await cache.set(CACHE_KEY, fresh);
      }
      return fresh;
    } catch {
      // Network / server error — surface as "no data" so UI hides the chip.
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export const AuditoryController = {
  /** Public accessor used by hooks. */
  getIndex(): Promise<AuditoryIndexDto | null> {
    return ensureIndex();
  },

  /** Currently in-memory index or null (synchronous, no I/O). */
  peek(): AuditoryIndexDto | null {
    return inMemory;
  },

  /** Force re-fetch, e.g. on manual pull-to-refresh in the future. */
  async refresh(): Promise<AuditoryIndexDto | null> {
    inMemory = null;
    inFlight = null;
    await cache.invalidate(CACHE_KEY);
    return ensureIndex();
  },
};
