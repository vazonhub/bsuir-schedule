import { normalizeAuditoryName, pickAuditoryKey } from '@utils/auditory';

describe('normalizeAuditoryName', () => {
  it('trims, collapses whitespace, and lowercases', () => {
    expect(normalizeAuditoryName('  605А-4  ')).toBe('605а-4');
  });

  it('strips a trailing building marker (к. / корп.)', () => {
    expect(normalizeAuditoryName('315-1 к.')).toBe('315-1');
    expect(normalizeAuditoryName('315-1 корп.')).toBe('315-1');
    expect(normalizeAuditoryName('315-1 к')).toBe('315-1');
  });

  it('is idempotent and produces equal keys for equivalent inputs', () => {
    expect(normalizeAuditoryName('315-1')).toBe(normalizeAuditoryName(' 315-1 к. '));
  });
});

describe('pickAuditoryKey', () => {
  it('returns null for null/undefined/empty input', () => {
    expect(pickAuditoryKey(null)).toBeNull();
    expect(pickAuditoryKey(undefined)).toBeNull();
    expect(pickAuditoryKey([])).toBeNull();
  });

  it('returns the first non-empty normalized key', () => {
    expect(pickAuditoryKey(['', '  ', '315-1 к.'])).toBe('315-1');
  });

  it('returns null when all entries normalize to empty', () => {
    expect(pickAuditoryKey(['', ' к. '])).toBeNull();
  });
});
