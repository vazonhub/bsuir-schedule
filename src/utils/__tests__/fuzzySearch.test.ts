import { buildSearchIndex, fuzzyFilter, normalizeForSearch, tokenize } from '@utils/fuzzySearch';

describe('normalizeForSearch', () => {
  it('lowercases and collapses ё → е', () => {
    expect(normalizeForSearch('Семёнов')).toBe('семенов');
    expect(normalizeForSearch('ЁЖИК')).toBe('ежик');
  });
});

describe('tokenize', () => {
  it('splits on whitespace and drops empty tokens', () => {
    expect(tokenize('  Алексеев   Игорь ')).toEqual(['алексеев', 'игорь']);
  });

  it('returns an empty array for a blank string', () => {
    expect(tokenize('   ')).toEqual([]);
  });
});

interface Person {
  name: string;
  extra?: string | null;
}

const people: Person[] = [
  { name: 'Алексеев Игорь Геннадьевич' },
  { name: 'Семёнов Пётр Иванович' },
  { name: 'Иванов Иван Иванович', extra: null },
  { name: 'Петров Алексей Сергеевич' },
];

const index = buildSearchIndex(people, (p) => [p.name, p.extra]);

describe('buildSearchIndex', () => {
  it('extracts normalized words from all non-empty fields', () => {
    const idx = buildSearchIndex([{ name: 'Иванов Иван', extra: 'Доцент' }], (p) => [
      p.name,
      p.extra,
    ]);
    expect(idx[0]?.words).toEqual(['иванов', 'иван', 'доцент']);
  });

  it('skips null / undefined fields', () => {
    const idx = buildSearchIndex([{ name: 'Иванов', extra: null }], (p) => [p.name, p.extra]);
    expect(idx[0]?.words).toEqual(['иванов']);
  });

  it('caches one bigram set per word', () => {
    const idx = buildSearchIndex([{ name: 'Иванов Иван' }], (p) => [p.name]);
    expect(idx[0]?.wordBigrams).toHaveLength(2);
  });
});

describe('fuzzyFilter', () => {
  it('returns every item for a blank query, preserving order', () => {
    expect(fuzzyFilter(index, '   ')).toEqual(people);
  });

  it('finds an exact word match', () => {
    const result = fuzzyFilter(index, 'Иванов');
    expect(result[0]?.name).toBe('Иванов Иван Иванович');
  });

  it('matches by prefix', () => {
    const result = fuzzyFilter(index, 'Алексе');
    expect(result.map((p) => p.name)).toContain('Алексеев Игорь Геннадьевич');
  });

  it('treats ё and е as equal (normalization)', () => {
    const result = fuzzyFilter(index, 'Семенов');
    expect(result[0]?.name).toBe('Семёнов Пётр Иванович');
  });

  it('tolerates a typo via bigram fuzzy match', () => {
    // "алексев" is neither a prefix nor substring of "алексеев" → fuzzy path.
    const result = fuzzyFilter(index, 'алексев');
    expect(result.map((p) => p.name)).toContain('Алексеев Игорь Геннадьевич');
  });

  it('requires ALL tokens of a multi-word query to match', () => {
    const result = fuzzyFilter(index, 'Алексее Игорь');
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Алексеев Игорь Геннадьевич');
  });

  it('returns an empty list when nothing matches', () => {
    expect(fuzzyFilter(index, 'zzzzz')).toEqual([]);
  });

  it('ranks exact matches above prefix-only matches', () => {
    const items = [{ name: 'Алексеев' }, { name: 'Алексей' }];
    const idx = buildSearchIndex(items, (p) => [p.name]);
    // "алексей" is exact for the second item, prefix for neither of the first.
    const result = fuzzyFilter(idx, 'алексей');
    expect(result[0]?.name).toBe('Алексей');
  });
});
