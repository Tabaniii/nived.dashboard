function emptyRow(code) {
  return {
    code,
    taps: 0,
    ratedTaps: 0,
    starSum: 0,
    positive: 0,
    negative: 0,
    feedbackCount: 0,
    complaintCount: 0,
  };
}

function compareRows(a, b) {
  return (
    b.positive - a.positive ||
    (b.avgStars ?? -1) - (a.avgStars ?? -1) ||
    b.taps - a.taps ||
    a.code.localeCompare(b.code)
  );
}

/**
 * Aggregate taps (with star telemetry) and written feedback per staff or table code.
 * Ranked by positive (4–5★) ratings, then average stars, then taps.
 *
 * @param {{
 *   taps?: Array<{ staff_code?: string|null, table_code?: string|null, selected_stars?: number|null }>,
 *   feedbacks?: Array<{ staff_code?: string|null, table_code?: string|null, rating: number }>,
 *   key?: 'staff_code'|'table_code',
 * }} [input]
 */
export function buildLeaderboard({ taps = [], feedbacks = [], key = 'staff_code' } = {}) {
  const rows = new Map();
  const rowFor = (code) => {
    if (!rows.has(code)) rows.set(code, emptyRow(code));
    return rows.get(code);
  };

  for (const tap of taps) {
    const code = tap?.[key];
    if (!code) continue;
    const row = rowFor(code);
    row.taps += 1;

    const stars = Number(tap.selected_stars);
    if (Number.isInteger(stars) && stars >= 1 && stars <= 5) {
      row.ratedTaps += 1;
      row.starSum += stars;
      if (stars >= 4) row.positive += 1;
      else row.negative += 1;
    }
  }

  for (const feedback of feedbacks) {
    const code = feedback?.[key];
    if (!code) continue;
    const row = rowFor(code);
    row.feedbackCount += 1;
    const rating = Number(feedback.rating);
    if (rating >= 1 && rating <= 3) row.complaintCount += 1;
  }

  return [...rows.values()]
    .map(({ starSum, ...row }) => ({
      code: row.code,
      taps: row.taps,
      ratedTaps: row.ratedTaps,
      avgStars: row.ratedTaps ? Math.round((starSum / row.ratedTaps) * 100) / 100 : null,
      positive: row.positive,
      negative: row.negative,
      positiveRate: row.ratedTaps ? Math.round((row.positive / row.ratedTaps) * 1000) / 1000 : null,
      feedbackCount: row.feedbackCount,
      complaintCount: row.complaintCount,
    }))
    .sort(compareRows);
}
