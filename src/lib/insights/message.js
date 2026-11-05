/** Plain-text weekly digest for WhatsApp and Telegram. */
export function buildWeeklySummaryMessage({ businessName, summary, dashboardUrl }) {
  return [
    `Ringkasan Mingguan — ${businessName || 'Toko Anda'}`,
    `${summary.feedback_count ?? 0} masukan pribadi`,
    '',
    summary.summary,
    ...(dashboardUrl ? ['', `Detail: ${dashboardUrl}`] : []),
  ].join('\n');
}
