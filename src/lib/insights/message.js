/**
 * Plain-text weekly digest for WhatsApp/Telegram.
 *
 * @param {{
 *   businessName?: string,
 *   summary: { summary: string, themes?: Array<{ label: string, count: number, detail?: string }>, actions?: string[], feedback_count?: number, complaint_count?: number, avg_rating?: number|null },
 *   dashboardUrl?: string,
 * }} params
 * @returns {string}
 */
export function buildWeeklySummaryMessage({ businessName, summary, dashboardUrl }) {
  const stats = [
    `${summary.feedback_count ?? 0} masukan`,
    `${summary.complaint_count ?? 0} keluhan 1–3★`,
    summary.avg_rating != null ? `rata-rata ${Number(summary.avg_rating).toFixed(1)}★` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const lines = [`📊 Ringkasan Mingguan — ${businessName || 'Toko Anda'}`, stats, '', summary.summary];

  const themes = Array.isArray(summary.themes) ? summary.themes.slice(0, 5) : [];
  if (themes.length) {
    lines.push('', 'Tema utama:');
    for (const theme of themes) {
      lines.push(`• ${theme.label} (${theme.count})${theme.detail ? ` — ${theme.detail}` : ''}`);
    }
  }

  const actions = Array.isArray(summary.actions) ? summary.actions.slice(0, 4) : [];
  if (actions.length) {
    lines.push('', 'Saran minggu depan:');
    actions.forEach((action, index) => lines.push(`${index + 1}. ${action}`));
  }

  if (dashboardUrl) lines.push('', `Detail: ${dashboardUrl}`);
  return lines.join('\n');
}
