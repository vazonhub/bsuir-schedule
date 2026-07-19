export interface Holiday {
  /** ISO date string, e.g. "2026-05-01". */
  date: string;
  /** Localized holiday name, e.g. "День труда". */
  name: string;
}

/** Response shape from Nager.Date API. */
export interface NagerDateHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  types: string[];
}
