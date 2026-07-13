/**
 * BSUIR auditory-occupancy crawler.
 *
 * Runs from GitHub Actions (`.github/workflows/crawl-auditories.yml`) — NOT
 * from Cloudflare Worker, because CF Workers free tier caps subrequests at 50
 * per invocation, and we need to hit ~1500 group endpoints.
 *
 * Flow:
 *   1. GET /api/v1/schedule/current-week
 *   2. GET /api/v1/student-groups
 *   3. For each group (concurrency = 10, throttle ~120ms): GET /schedule?studentGroup=...
 *   4. Build inverted index: auditory → day → slots[]
 *   5. POST full JSON to the Cloudflare Worker's /index endpoint (Bearer auth)
 *
 * Env vars (provided as GitHub Action secrets):
 *   WORKER_URL     — e.g. https://bsuir-auditory-api.<subdomain>.workers.dev
 *   CRAWL_TOKEN    — Bearer token that matches the Worker's secret
 *   MAX_GROUPS     — optional, cap for local testing (e.g. 50)
 */

import { normalizeAuditoryName } from './normalize';
import type { AuditoryIndex, AuditorySlot, DayNameRu } from './types';

const BSUIR_API = 'https://iis.bsuir.by/api/v1';
const CONCURRENCY = 10;
const REQUEST_DELAY_MS = 120;
const RETRY_MAX = 2;
const RETRY_BACKOFF_MS = 2_000;

interface RawLesson {
  auditories: string[];
  startLessonTime: string;
  endLessonTime: string;
  lessonTypeAbbrev: string | null;
  numSubgroup: 0 | 1 | 2;
  subject: string;
  weekNumber: number[];
  dateLesson: string | null;
  studentGroups: Array<{ name: string }>;
}

interface RawSchedule {
  schedules: Partial<Record<DayNameRu, RawLesson[]>> | null;
}

interface RawGroup {
  name: string;
}

const DAY_NAMES: readonly DayNameRu[] = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

async function main(): Promise<void> {
  const workerUrl = required('WORKER_URL');
  const crawlToken = required('CRAWL_TOKEN');
  const maxGroups = Number(process.env.MAX_GROUPS ?? '') || undefined;

  console.log('[crawler] fetching current week…');
  const currentWeek = (await fetchJson<number>(`${BSUIR_API}/schedule/current-week`)) as
    | 1
    | 2
    | 3
    | 4;
  console.log(`[crawler] current week = ${currentWeek}`);

  console.log('[crawler] fetching group list…');
  const groups = await fetchJson<RawGroup[]>(`${BSUIR_API}/student-groups`);
  const groupNames = groups.map((g) => g.name).filter(Boolean);
  const targets = maxGroups ? groupNames.slice(0, maxGroups) : groupNames;
  console.log(`[crawler] ${targets.length} groups to crawl (concurrency=${CONCURRENCY})`);

  const index: Record<string, Record<string, AuditorySlot[]>> = {};
  let done = 0;
  let failed = 0;

  await runPool(targets, CONCURRENCY, async (groupName) => {
    try {
      const schedule = await fetchJson<RawSchedule>(
        `${BSUIR_API}/schedule?studentGroup=${encodeURIComponent(groupName)}`,
      );
      absorb(index, groupName, schedule);
    } catch (err) {
      failed++;
      console.warn(`[crawler] group ${groupName} failed: ${(err as Error).message}`);
    }
    done++;
    if (done % 100 === 0 || done === targets.length) {
      console.log(`[crawler] ${done}/${targets.length} (failed=${failed})`);
    }
    await sleep(REQUEST_DELAY_MS);
  });

  // Finalize: dedupe & sort each day's slots.
  for (const day of Object.values(index)) {
    for (const key of Object.keys(day)) {
      day[key] = dedupeSort(day[key]!);
    }
  }

  const payload: AuditoryIndex & { groupCount: number } = {
    updatedAt: new Date().toISOString(),
    currentWeek,
    auditories: index,
    groupCount: targets.length - failed,
  };

  const bodyStr = JSON.stringify(payload);
  console.log(
    `[crawler] built index: ${Object.keys(index).length} auditories, ${(bodyStr.length / 1024).toFixed(1)} KB`,
  );

  console.log(`[crawler] POST ${workerUrl}/index …`);
  const res = await fetch(`${workerUrl.replace(/\/$/, '')}/index`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${crawlToken}`,
      'content-type': 'application/json',
    },
    body: bodyStr,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Worker upload failed: HTTP ${res.status} ${t}`);
  }
  console.log('[crawler] uploaded ✓', await res.text());
}

function absorb(
  index: Record<string, Record<string, AuditorySlot[]>>,
  groupName: string,
  schedule: RawSchedule,
): void {
  const schedules = schedule.schedules;
  if (!schedules) return;
  for (const day of DAY_NAMES) {
    const lessons = schedules[day];
    if (!lessons) continue;
    for (const l of lessons) {
      for (const rawAud of l.auditories ?? []) {
        const audKey = normalizeAuditoryName(rawAud);
        if (!audKey) continue;
        const perAud = (index[audKey] ??= {});
        const perDay = (perAud[day] ??= []);
        perDay.push({
          startTime: l.startLessonTime,
          endTime: l.endLessonTime,
          weekNumber: Array.isArray(l.weekNumber) ? l.weekNumber : [],
          subject: l.subject,
          lessonTypeAbbrev: l.lessonTypeAbbrev,
          groups: dedupeStrings([groupName, ...(l.studentGroups?.map((g) => g.name) ?? [])]),
          numSubgroup: l.numSubgroup,
          dateLesson: l.dateLesson,
        });
      }
    }
  }
}

/**
 * Multiple groups scheduled in the same auditory at the same time produce
 * duplicate slots when we crawl them separately. Merge them by
 * (start,end,weekNumber,subject,dateLesson) and union their group lists.
 */
function dedupeSort(slots: AuditorySlot[]): AuditorySlot[] {
  const byKey = new Map<string, AuditorySlot>();
  for (const s of slots) {
    const key = `${s.startTime}|${s.endTime}|${(s.weekNumber ?? []).join(',')}|${s.subject}|${s.dateLesson ?? ''}|${s.lessonTypeAbbrev ?? ''}|${s.numSubgroup}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.groups = dedupeStrings([...existing.groups, ...s.groups]).sort();
    } else {
      byKey.set(key, { ...s, groups: dedupeStrings(s.groups).sort() });
    }
  }
  return [...byKey.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function dedupeStrings(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

async function fetchJson<T>(url: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_MAX) {
        await sleep(RETRY_BACKOFF_MS * (attempt + 1));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = items.slice();
  const runners = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item === undefined) return;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

main().catch((err) => {
  console.error('[crawler] FATAL', err);
  process.exit(1);
});
