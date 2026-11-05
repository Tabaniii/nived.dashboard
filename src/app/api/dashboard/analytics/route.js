import { unstable_rethrow } from 'next/navigation';
import { getClientDashboardData } from '@/app/(dashboard)/dashboard/queries';
import { authorizeDashboardRequest, dashboardJson } from '../access';

export const instant = false;

export async function GET(request) {
  try {
    const { ctx, error } = await authorizeDashboardRequest(request);
    if (error) return error;

    const data = await getClientDashboardData(ctx.merchant.id, false);
    return dashboardJson({ daily: data.daily, weekly: data.weekly, peakHours: data.peakHours, kpi: data.kpi });
  } catch (error) {
    unstable_rethrow(error);
    console.error('[api/dashboard/analytics]', error);
    return dashboardJson({ error: 'Server error' }, 500);
  }
}
