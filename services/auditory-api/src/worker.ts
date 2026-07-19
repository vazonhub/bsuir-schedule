import type { AuditoryIndexMeta } from './types';

export interface Env {
  AUDITORY_KV: KVNamespace;
  /** Bearer token required for POST /index (set via `wrangler secret put CRAWL_TOKEN`). */
  CRAWL_TOKEN: string;
}

const KV_INDEX = 'index';
const KV_META = 'meta';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-max-age': '86400',
} as const;

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  ...CORS_HEADERS,
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/') {
      return json({ ok: true, service: 'bsuir-auditory-api' });
    }
    if (req.method === 'GET' && url.pathname === '/index') {
      return handleGetIndex(env);
    }
    if (req.method === 'GET' && url.pathname === '/meta') {
      return handleGetMeta(env);
    }
    if (req.method === 'POST' && url.pathname === '/index') {
      return handlePostIndex(req, env);
    }
    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },
};

async function handleGetIndex(env: Env): Promise<Response> {
  // `cacheTtl: 3600` makes CF cache the KV read at the edge for 1h,
  // dramatically reducing KV read ops when many clients hit the same POP.
  const raw = await env.AUDITORY_KV.get(KV_INDEX, { cacheTtl: 3600 });
  if (!raw) {
    return new Response(JSON.stringify({ error: 'not-ready' }), {
      status: 503,
      headers: JSON_HEADERS,
    });
  }
  return new Response(raw, {
    headers: {
      ...JSON_HEADERS,
      // Clients cache for 1h. Nightly cron rebuilds — worst-case staleness ~25h.
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}

async function handleGetMeta(env: Env): Promise<Response> {
  const raw = await env.AUDITORY_KV.get(KV_META, { cacheTtl: 300 });
  return new Response(raw ?? 'null', { headers: JSON_HEADERS });
}

async function handlePostIndex(req: Request, env: Env): Promise<Response> {
  const auth = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${env.CRAWL_TOKEN}`;
  if (!env.CRAWL_TOKEN || auth !== expected) {
    return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
  }

  const body = await req.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: CORS_HEADERS });
  }

  if (!isIndexShape(parsed)) {
    return new Response('Invalid index shape', { status: 400, headers: CORS_HEADERS });
  }

  const auditoryCount = Object.keys(parsed.auditories).length;
  const groupCount = parsed.groupCount ?? 0;
  const meta: AuditoryIndexMeta = {
    updatedAt: parsed.updatedAt,
    currentWeek: parsed.currentWeek,
    auditoryCount,
    groupCount,
    bytes: body.length,
  };

  await Promise.all([
    env.AUDITORY_KV.put(KV_INDEX, body),
    env.AUDITORY_KV.put(KV_META, JSON.stringify(meta)),
  ]);

  return json({ ok: true, ...meta });
}

interface CrawlPayload {
  updatedAt: string;
  currentWeek: 1 | 2 | 3 | 4;
  auditories: Record<string, unknown>;
  groupCount?: number;
}

function isIndexShape(v: unknown): v is CrawlPayload {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.updatedAt === 'string' &&
    typeof o.currentWeek === 'number' &&
    o.currentWeek >= 1 &&
    o.currentWeek <= 4 &&
    typeof o.auditories === 'object' &&
    o.auditories !== null
  );
}

function json(v: unknown, status = 200): Response {
  return new Response(JSON.stringify(v), { status, headers: JSON_HEADERS });
}
