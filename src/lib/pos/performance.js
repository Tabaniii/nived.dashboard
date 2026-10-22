// Payments belong to the staff member who collected them, not the order creator.
export function staffPerformance({ profiles = [], payments = [], shifts = [] }, from, to, now = new Date()) {
  const start = from ? new Date(from).getTime() : -Infinity;
  const end = to ? new Date(to).getTime() : Infinity;
  const rows = new Map(profiles.map(p => [p.id, { staff_id: p.id, name: p.full_name || p.name, role: p.role, transactions: 0, collected: 0, refunds: 0, net_collected: 0, hours: 0, shifts: 0, cash_variance: 0 }]));
  const rowFor = id => {
    const key = id || 'unattributed';
    if (!rows.has(key)) rows.set(key, { staff_id: id || null, name: 'Unattributed / system', transactions: 0, collected: 0, refunds: 0, net_collected: 0, hours: 0, shifts: 0, cash_variance: 0 });
    return rows.get(key);
  };
  for (const p of payments) {
    const time = new Date(p.paid_at).getTime();
    if (!(time >= start && time < end)) continue;
    const row = rowFor(p.user_id);
    if (p.status === 'success') { row.transactions++; row.collected += Number(p.amount); }
    if (p.status === 'refunded') row.refunds += Number(p.amount);
  }
  for (const s of shifts) {
    const opened = new Date(s.opened_at).getTime();
    const closed = s.closed_at ? new Date(s.closed_at).getTime() : now.getTime();
    if (opened >= end || closed < start) continue;
    const row = rowFor(s.user_id);
    row.shifts++;
    row.hours += Math.max(0, Math.min(closed, end, now.getTime()) - Math.max(opened, start)) / 3600000;
    if (s.status === 'closed' && closed >= start && closed < end) row.cash_variance += Number(s.variance || 0);
  }
  return [...rows.values()].map(r => ({ ...r, net_collected: r.collected, original_collected: r.collected + r.refunds, average_payment: r.transactions ? r.collected / r.transactions : 0, collected_per_hour: r.hours ? r.collected / r.hours : null }));
}
