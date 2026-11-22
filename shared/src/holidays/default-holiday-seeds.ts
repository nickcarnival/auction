/**
 * Seed rows for the `holidays` collection. Server upserts by `code` on startup (first use).
 * `isDefault`: new tenants get these `code` values in `observedHolidayIds` when none are supplied.
 */
export const DEFAULT_HOLIDAY_SEEDS = [
  {
    code: 'us-new-years-day',
    label: "New Year's Day",
    typicalTiming: 'January 1',
    sortOrder: 10,
    isDefault: true,
  },
  {
    code: 'us-martin-luther-king-jr',
    label: 'Martin Luther King Jr. Day',
    typicalTiming: 'Third Monday in January',
    sortOrder: 20,
    isDefault: false,
  },
  {
    code: 'us-presidents-day',
    label: "Washington's Birthday (Presidents' Day)",
    typicalTiming: 'Third Monday in February',
    sortOrder: 30,
    isDefault: false,
  },
  {
    code: 'us-memorial-day',
    label: 'Memorial Day',
    typicalTiming: 'Last Monday in May',
    sortOrder: 40,
    isDefault: true,
  },
  {
    code: 'us-juneteenth',
    label: 'Juneteenth National Independence Day',
    typicalTiming: 'June 19',
    sortOrder: 50,
    isDefault: false,
  },
  {
    code: 'us-independence-day',
    label: 'Independence Day',
    typicalTiming: 'July 4',
    sortOrder: 60,
    isDefault: true,
  },
  {
    code: 'us-labor-day',
    label: 'Labor Day',
    typicalTiming: 'First Monday in September',
    sortOrder: 70,
    isDefault: true,
  },
  {
    code: 'us-columbus-day',
    label: 'Columbus Day',
    typicalTiming: 'Second Monday in October',
    sortOrder: 80,
    isDefault: false,
  },
  {
    code: 'us-veterans-day',
    label: 'Veterans Day',
    typicalTiming: 'November 11',
    sortOrder: 90,
    isDefault: false,
  },
  {
    code: 'us-thanksgiving',
    label: 'Thanksgiving Day',
    typicalTiming: 'Fourth Thursday in November',
    sortOrder: 100,
    isDefault: true,
  },
  {
    code: 'us-christmas',
    label: 'Christmas Day',
    typicalTiming: 'December 25',
    sortOrder: 110,
    isDefault: true,
  },
] as const;
