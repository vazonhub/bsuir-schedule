import axios from 'axios';

import type { Holiday, NagerDateHoliday } from '@models/holiday';

const NAGER_BASE = 'https://date.nager.at/api/v3';

export const HolidaysApi = {
  /**
   * Fetch public holidays for Belarus for a given year.
   * `useEnglish` — if true, use the English name; otherwise the local (Belarusian) name.
   */
  async fetchByYear(year: number, useEnglish = false): Promise<Holiday[]> {
    const { data } = await axios.get<NagerDateHoliday[]>(
      `${NAGER_BASE}/PublicHolidays/${year}/BY`,
      { timeout: 10_000 },
    );
    return data
      .filter((h) => h.types.includes('Public'))
      .map((h) => ({ date: h.date, name: useEnglish ? h.name : h.localName }));
  },
};
