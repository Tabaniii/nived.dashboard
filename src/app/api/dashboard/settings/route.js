import { unstable_rethrow } from 'next/navigation';
import { updateCardSettingsAction } from '@/app/(dashboard)/dashboard/actions';
import { getClientCards } from '@/app/(dashboard)/dashboard/queries';
import { authorizeDashboardRequest, dashboardJson } from '../access';

export const instant = false;

export async function GET(request) {
  try {
    const { ctx, error } = await authorizeDashboardRequest(request);
    if (error) return error;

    const cards = await getClientCards(ctx.merchant.id);
    return dashboardJson({ cards });
  } catch (error) {
    unstable_rethrow(error);
    console.error('[api/dashboard/settings GET]', error);
    return dashboardJson({ error: 'Database error' }, 500);
  }
}

/**
 * Body JSON: { card_id, google_review_url?, store_id?, whatsapp_number?, store_name? }
 */
export async function PATCH(request) {
  const { ctx, error } = await authorizeDashboardRequest(request);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return dashboardJson({ error: 'Invalid JSON payload' }, 400);
  }
  if (body?.store_id != null && body.store_id !== ctx.merchant.id) {
    return dashboardJson({ error: 'Store access denied' }, 403);
  }

  const formData = new FormData();
  formData.set('card_id', String(body?.card_id || ''));
  if (body?.google_review_url != null) {
    formData.set('google_review_url', String(body.google_review_url));
  }
  if (body?.whatsapp_number != null) {
    formData.set('whatsapp_number', String(body.whatsapp_number));
  }
  if (body?.store_name != null) {
    formData.set('store_name', String(body.store_name));
  }

  const result = await updateCardSettingsAction(formData, ctx.merchant.id);
  if (result?.error) {
    return dashboardJson({ error: result.error }, 400);
  }

  return dashboardJson({ success: true });
}
