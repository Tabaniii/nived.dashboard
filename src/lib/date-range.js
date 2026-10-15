const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

export const DATE_RANGES = Object.freeze({
  month: 'Bulan ini',
  last_month: 'Bulan lalu',
  '30d': '30 hari terakhir',
});

function startOfWibMonth(date, monthOffset = 0) {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  return new Date(
    Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth() + monthOffset, 1) - WIB_OFFSET_MS
  );
}

/**
 * Reporting windows aligned to the Jakarta (WIB) calendar.
 *
 * @param {string} key
 * @param {Date} [now]
 * @returns {{ key: 'month'|'last_month'|'30d', label: string, start: Date, end: Date }}
 */
export function resolveDateRange(key, now = new Date()) {
  const rangeKey = Object.hasOwn(DATE_RANGES, key) ? key : 'month';
  let start;
  let end = now;

  if (rangeKey === 'last_month') {
    start = startOfWibMonth(now, -1);
    end = startOfWibMonth(now);
  } else if (rangeKey === '30d') {
    start = new Date(now.getTime() - 30 * DAY_MS);
  } else {
    start = startOfWibMonth(now);
  }

  return { key: rangeKey, label: DATE_RANGES[rangeKey], start, end };
}
