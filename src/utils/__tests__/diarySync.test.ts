import {
  SNAPSHOT_VERSION,
  isDiaryCloudSnapshot,
  sanitizeDiaryFields,
  type DiaryCloudSnapshot,
  type DiaryRemoteFields,
} from '@utils/diarySync';

const validSnapshot = (over: Partial<DiaryCloudSnapshot> = {}): DiaryCloudSnapshot => ({
  v: SNAPSHOT_VERSION,
  updatedAt: 1_700_000_000_000,
  progress: {
    '410101': {
      МАТ: { ЛР: { taskCount: 10, completed: [1, 2] }, ПЗ: { taskCount: 4, completed: [1] } },
    },
  },
  hidden: { '410101': ['ФИЗ'] },
  planner: { '410101': [{ id: 'p1', subject: 'МАТ', type: 'ЛР', taskIndex: 3 }] },
  blockedLessons: { '410101': ['blk1'] },
  diaryOnboardingSeen: true,
  ...over,
});

describe('isDiaryCloudSnapshot', () => {
  it('accepts a well-formed snapshot', () => {
    expect(isDiaryCloudSnapshot(validSnapshot())).toBe(true);
  });

  it('accepts a legacy v1 snapshot (flat progress, untyped planner)', () => {
    const legacy = {
      v: 1,
      updatedAt: 1,
      progress: { g: { s: { taskCount: 5, completed: [1] } } },
      hidden: {},
      planner: { g: [{ id: 'a', subject: 's', taskIndex: 1 }] },
      blockedLessons: {},
      diaryOnboardingSeen: false,
    };
    expect(isDiaryCloudSnapshot(legacy)).toBe(true);
  });

  it('rejects non-objects, null, and arrays', () => {
    expect(isDiaryCloudSnapshot(null)).toBe(false);
    expect(isDiaryCloudSnapshot('nope')).toBe(false);
    expect(isDiaryCloudSnapshot([])).toBe(false);
  });

  it('rejects a mismatched schema version', () => {
    expect(isDiaryCloudSnapshot(validSnapshot({ v: SNAPSHOT_VERSION + 1 }))).toBe(false);
  });

  it('rejects a negative or non-finite updatedAt', () => {
    expect(isDiaryCloudSnapshot(validSnapshot({ updatedAt: -1 }))).toBe(false);
    expect(isDiaryCloudSnapshot(validSnapshot({ updatedAt: Number.NaN }))).toBe(false);
  });

  it('rejects malformed progress entries', () => {
    const bad = validSnapshot({
      progress: { g: { s: { ЛР: { taskCount: 1.5, completed: [] } } } },
    } as unknown as Partial<DiaryCloudSnapshot>);
    expect(isDiaryCloudSnapshot(bad)).toBe(false);
  });

  it('accepts null taskCount (type not configured yet)', () => {
    expect(
      isDiaryCloudSnapshot(
        validSnapshot({
          progress: { g: { s: { ЛР: { taskCount: null, completed: [] } } } },
        } as unknown as Partial<DiaryCloudSnapshot>),
      ),
    ).toBe(true);
  });

  it('rejects a planner item missing required fields', () => {
    const bad = validSnapshot({
      planner: { g: [{ id: 'x', subject: 'МАТ' }] },
    } as unknown as Partial<DiaryCloudSnapshot>);
    expect(isDiaryCloudSnapshot(bad)).toBe(false);
  });

  it('rejects a non-string-array hidden map', () => {
    const bad = validSnapshot({ hidden: { g: [1, 2] } } as unknown as Partial<DiaryCloudSnapshot>);
    expect(isDiaryCloudSnapshot(bad)).toBe(false);
  });
});

describe('sanitizeDiaryFields', () => {
  const base = (over: Partial<DiaryRemoteFields> = {}): DiaryRemoteFields => ({
    progress: {},
    hidden: {},
    planner: {},
    updatedAt: 100,
    ...over,
  });

  it('clamps task counts into 0..99 and drops out-of-range completed indices', () => {
    const result = sanitizeDiaryFields(
      base({
        progress: { g: { s: { ЛР: { taskCount: 250, completed: [0, 1, 300] } } } },
      } as unknown as DiaryRemoteFields),
    );
    expect(result.progress.g?.s?.ЛР.taskCount).toBe(99);
    expect(result.progress.g?.s?.ЛР.completed).toEqual([1]); // 0 and 300 removed
  });

  it('empties completed when taskCount is null', () => {
    const result = sanitizeDiaryFields(
      base({
        progress: { g: { s: { ЛР: { taskCount: null, completed: [1, 2, 3] } } } },
      } as unknown as DiaryRemoteFields),
    );
    expect(result.progress.g?.s?.ЛР).toEqual({ taskCount: null, completed: [] });
  });

  it('upgrades a legacy flat entry into the ЛР slot', () => {
    const result = sanitizeDiaryFields(
      base({
        progress: { g: { s: { taskCount: 5, completed: [1, 2] } } },
      } as unknown as DiaryRemoteFields),
    );
    expect(result.progress.g?.s?.ЛР).toEqual({ taskCount: 5, completed: [1, 2] });
    expect(result.progress.g?.s?.ПЗ).toEqual({ taskCount: null, completed: [] });
  });

  it('deduplicates completed indices', () => {
    const result = sanitizeDiaryFields(
      base({
        progress: { g: { s: { ПЗ: { taskCount: 5, completed: [2, 2, 3, 3] } } } },
      } as unknown as DiaryRemoteFields),
    );
    expect(result.progress.g?.s?.ПЗ.completed).toEqual([2, 3]);
  });

  it('deduplicates hidden subject lists', () => {
    const result = sanitizeDiaryFields(base({ hidden: { g: ['МАТ', 'МАТ', 'ФИЗ'] } }));
    expect(result.hidden.g).toEqual(['МАТ', 'ФИЗ']);
  });

  it('drops planner items pointing past the task count or at completed tasks', () => {
    const result = sanitizeDiaryFields(
      base({
        progress: { g: { s: { ЛР: { taskCount: 3, completed: [2] } } } },
        planner: {
          g: [
            { id: 'a', subject: 's', type: 'ЛР', taskIndex: 1 }, // ok
            { id: 'b', subject: 's', type: 'ЛР', taskIndex: 5 }, // past taskCount → drop
            { id: 'c', subject: 's', type: 'ЛР', taskIndex: 2 }, // already completed → drop
          ],
        },
      } as unknown as DiaryRemoteFields),
    );
    expect(result.planner.g?.map((i) => i.id)).toEqual(['a']);
  });

  it('keeps same-index planner items in different types', () => {
    const result = sanitizeDiaryFields(
      base({
        progress: {
          g: { s: { ЛР: { taskCount: 3, completed: [] }, ПЗ: { taskCount: 3, completed: [] } } },
        },
        planner: {
          g: [
            { id: 'a', subject: 's', type: 'ЛР', taskIndex: 1 },
            { id: 'b', subject: 's', type: 'ПЗ', taskIndex: 1 }, // different type → kept
          ],
        },
      } as unknown as DiaryRemoteFields),
    );
    expect(result.planner.g?.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('defaults an untyped (legacy) planner item to ЛР', () => {
    const result = sanitizeDiaryFields(
      base({
        progress: { g: { s: { taskCount: 3, completed: [] } } },
        planner: { g: [{ id: 'a', subject: 's', taskIndex: 1 }] },
      } as unknown as DiaryRemoteFields),
    );
    expect(result.planner.g?.[0]?.type).toBe('ЛР');
  });

  it('preserves updatedAt', () => {
    expect(sanitizeDiaryFields(base({ updatedAt: 777 })).updatedAt).toBe(777);
  });
});
