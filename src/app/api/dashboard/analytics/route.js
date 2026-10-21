import { NextResponse } from 'next/server';
import { getClientContext, getClientDashboardData } from '@/app/(dashboard)/dashboard/queries';

export const instant = false;

export async function GET() {
  try {
    const ctx = await getClientContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getClientDashboardData(ctx.profile.merchant_id, false);
    return NextResponse.json(
      {
        daily: data.daily,
        weekly: data.weekly,
        peakHours: data.peakHours,
        kpi: data.kpi,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('[api/dashboard/analytics]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
