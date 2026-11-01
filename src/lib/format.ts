const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Date-only strings are formatted by hand: `new Date('2026-11-05')` is parsed
// as UTC midnight and can shift to another day in a local timezone. The grid
// lives in the event's timezone, so ISO strings are used as-is (ADR-0002).
function splitDate(isoDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

export function formatDate(isoDate: string): string {
  const { year, month, day } = splitDate(isoDate);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Column header: "Thu 5 Nov". */
export function formatDayHeader(isoDate: string): string {
  const { month, day } = splitDate(isoDate);
  // getUTCDay on an explicit UTC midnight is stable across timezones.
  const weekday = WEEKDAYS[new Date(`${isoDate}T00:00:00Z`).getUTCDay()];
  return `${weekday} ${day} ${MONTHS[month - 1]}`;
}

// Minutes-from-midnight, the server's working-hours format, rendered as HH:MM.
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/**
 * ISO dates from start to end, inclusive. Stepping in UTC avoids DST gaps
 * that would otherwise skip or repeat a day.
 */
export function isoDaysBetween(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}
