/**
 * Extract clean uppercase initials for businesses without a usable logo.
 * @param {string} storeName
 * @returns {string}
 */
export function getStoreInitials(storeName) {
  if (!storeName || typeof storeName !== 'string') return 'RT';
  const parts = storeName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return storeName.trim().slice(0, 2).toUpperCase() || 'RT';
}
