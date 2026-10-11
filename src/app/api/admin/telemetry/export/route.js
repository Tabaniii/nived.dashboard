import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { listTelemetry } from '@/app/(admin)/admin/queries';

export const instant = false;

function sanitizeTaps(taps) {
  return (taps || []).map((t) => ({
    id: t.id,
    card_slug: t.cards?.slug || null,
    store_name: t.cards?.store_name || null,
    device_os: t.device_os,
    user_agent: t.user_agent,
    selected_stars: t.selected_stars,
    ip_hash: t.ip_hash,
    created_at: t.created_at,
  }));
}

function sanitizeFeedbacks(feedbacks) {
  return (feedbacks || []).map((f) => ({
    id: f.id,
    card_slug: f.cards?.slug || null,
    store_name: f.cards?.store_name || null,
    rating: f.rating,
    feedback_text: f.feedback_text,
    customer_whatsapp: f.customer_whatsapp,
    created_at: f.created_at,
  }));
}

function toCsv(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [keys.join(','), ...rows.map((r) => keys.map((k) => escape(r[k])).join(','))].join(
    '\n'
  );
}

/**
 * Query: ?format=json|csv&dataset=taps|feedbacks|all
 */
export async function GET(request) {
  const session = await requireRole('admin');
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') || 'json').toLowerCase();
  const dataset = (searchParams.get('dataset') || 'all').toLowerCase();

  try {
    const { taps, feedbacks } = await listTelemetry({ limit: 1000 });
    const tapRows = sanitizeTaps(taps);
    const feedbackRows = sanitizeFeedbacks(feedbacks);

    if (format === 'csv') {
      const rows = dataset === 'feedbacks' ? feedbackRows : tapRows;
      const filename =
        dataset === 'feedbacks' ? 'nived-feedbacks.csv' : 'nived-taps.csv';
      return new NextResponse(toCsv(rows), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const payload =
      dataset === 'taps'
        ? { taps: tapRows }
        : dataset === 'feedbacks'
          ? { feedbacks: feedbackRows }
          : { taps: tapRows, feedbacks: feedbackRows };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[api/admin/telemetry/export]', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
