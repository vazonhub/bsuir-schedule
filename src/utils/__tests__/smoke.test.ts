/** Smoke test — verifies the jest-expo harness and alias resolution work. */
import { normalizeForSearch } from '@utils/fuzzySearch';

describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });

  it('resolves @-aliases via babel module-resolver', () => {
    expect(normalizeForSearch('Ёлка')).toBe('елка');
  });
});
