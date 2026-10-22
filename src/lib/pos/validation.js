export const POS_ROLES = ['owner', 'manager', 'cashier', 'waiter', 'kitchen'];
export function uuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function businessDates(from, through) {
  const valid = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  if (!valid(from) || !valid(through)) throw new Error('Choose valid business dates.');
  const start = new Date(`${from}T00:00:00+07:00`);
  const end = new Date(Date.parse(`${through}T00:00:00+07:00`) + 86400000);
  if (end <= start || end - start > 93 * 86400000) throw new Error('Choose a period of 1–93 days.');
  return { from: start.toISOString(), to: end.toISOString() };
}
