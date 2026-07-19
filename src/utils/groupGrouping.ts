import i18n from '@i18n';
import type { StudentGroupDto } from '@models/dto';

/**
 * Section produced by `groupByFaculty` — shape compatible with React Native
 * `SectionList`. The `key` is a string (we use `facultyId`) so RN can stably
 * identify sections across renders.
 *
 * Special pinned section uses `key: 'pinned'` and an empty `facultyName`.
 */
export interface GroupSection {
  key: string;
  facultyAbbrev: string;
  facultyName: string;
  data: StudentGroupDto[];
}

export const PINNED_SECTION_KEY = 'pinned';

/**
 * Build a virtual "Pinned" section out of the user's pinned group names.
 * Returns `null` if nothing is pinned (callers should skip).
 */
export const buildPinnedSection = (
  groups: StudentGroupDto[],
  pinnedNames: string[],
): GroupSection | null => {
  if (pinnedNames.length === 0) return null;
  const pinnedSet = new Set(pinnedNames);
  const data = groups.filter((g) => pinnedSet.has(g.name));
  if (data.length === 0) return null;
  // Keep the pinning order (as in pinnedNames), not alphabetical.
  data.sort((a, b) => pinnedNames.indexOf(a.name) - pinnedNames.indexOf(b.name));
  return {
    key: PINNED_SECTION_KEY,
    facultyAbbrev: i18n.t('groups.favorites'),
    facultyName: '',
    data,
  };
};

const compareGroups = (a: StudentGroupDto, b: StudentGroupDto): number => {
  if (a.course !== b.course) return a.course - b.course;
  return a.name.localeCompare(b.name);
};

const compareSections = (a: GroupSection, b: GroupSection): number =>
  a.facultyAbbrev.localeCompare(b.facultyAbbrev, 'ru');

/**
 * Splits a flat list of groups into faculty-bucket sections.
 *
 * - Sections are sorted alphabetically by `facultyAbbrev` (Russian locale).
 * - Within each section, groups are ordered first by `course`, then by `name`.
 * - Empty input → empty array (no synthetic sections).
 */
export const groupByFaculty = (groups: StudentGroupDto[]): GroupSection[] => {
  const map = new Map<number, GroupSection>();

  for (const g of groups) {
    let section = map.get(g.facultyId);
    if (!section) {
      section = {
        key: String(g.facultyId),
        facultyAbbrev: g.facultyAbbrev,
        facultyName: g.facultyName,
        data: [],
      };
      map.set(g.facultyId, section);
    }
    section.data.push(g);
  }

  const sections = Array.from(map.values());
  for (const s of sections) s.data.sort(compareGroups);
  sections.sort(compareSections);
  return sections;
};
