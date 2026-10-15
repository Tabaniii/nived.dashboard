/**
 * True when PostgREST/Postgres rejects a query because a column or table from
 * a pending migration does not exist yet.
 *
 * @param {{ code?: string, message?: string }|null|undefined} error
 * @returns {boolean}
 */
export function isMissingSchemaError(error) {
  if (!error) return false;
  if (['PGRST204', 'PGRST205', '42703', '42P01'].includes(error.code)) return true;
  return /column .* does not exist|could not find the .* (column|table)|relation .* does not exist/i.test(
    error.message || ''
  );
}
