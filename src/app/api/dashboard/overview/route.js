import { unstable_rethrow } from 'next/navigation';
import { getClientDashboardData } from '@/app/(dashboard)/dashboard/queries';
import { authorizeDashboardRequest, dashboardJson } from '../access';

export const instant = false;

export async function GET(request) {
  try {
    const { ctx, error } = await authorizeDashboardRequest(request);
    if (error) return error;

    const data = await getClientDashboardData(ctx.merchant.id);
    return dashboardJson({
      merchant: ctx.merchant,
      profile: {
        email: ctx.profile.email,
        full_name: ctx.profile.full_name,
        role: ctx.profile.role,
        dashboard_role: ctx.profile.dashboard_role,
      },
      ...data,
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error('[api/dashboard/overview]', error);
    return dashboardJson({ error: 'Database error' }, 500);
  }
}
