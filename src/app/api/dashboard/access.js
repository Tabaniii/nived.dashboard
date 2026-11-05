import { getClientContext } from '@/app/(dashboard)/dashboard/queries';

export const dashboardHeaders = { 'Cache-Control': 'private, no-store' };

export function dashboardJson(data, status = 200) {
  return Response.json(data, { status, headers: dashboardHeaders });
}

export async function authorizeDashboardRequest(request) {
  const ctx = await getClientContext();
  if (!ctx) return { error: dashboardJson({ error: 'Unauthorized' }, 401) };

  const expectedStoreId = new URL(request.url).searchParams.get('store_id');
  if (!ctx.merchant || (expectedStoreId !== null && expectedStoreId !== ctx.merchant.id)) {
    return { error: dashboardJson({ error: 'Store access denied' }, 403) };
  }

  return { ctx };
}
