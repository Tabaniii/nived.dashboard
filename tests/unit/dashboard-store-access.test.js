import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getSessionProfile } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { generateAndStoreSummary } from '@/lib/insights/store';
import {
  refreshWeeklySummaryAction,
  selectDashboardStoreAction,
  updateFeedbackResolutionAction,
} from '@/app/(dashboard)/dashboard/actions';
import { DASHBOARD_STORE_COOKIE, getClientContext } from '@/app/(dashboard)/dashboard/queries';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ getSessionProfile: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/insights/store', () => ({ generateAndStoreSummary: vi.fn() }));

const ownerId = '937b7180-24dd-4596-aece-344722e93ed1';
const otherStoreId = '30d2d3ff-d926-494a-8687-0e283f642385';
const ownStore = { id: '6f284d8c-3709-45bb-913e-9c5ce262f11f', status: 'active' };
const suspendedStore = { id: otherStoreId, status: 'suspended' };
const feedbackId = '0e23aee8-278e-4908-8d69-a44ff762646e';

function session(role) {
  getSessionProfile.mockResolvedValue({
    user: { id: ownerId },
    profile: { dashboard_role: role, merchant_id: otherStoreId },
  });
}

function tableResult(data) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  cookies.mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: otherStoreId }),
    set: vi.fn(),
  });
});

describe('dashboard store context', () => {
  it('uses ownership over legacy membership and ignores the store cookie for an owner', async () => {
    session('owner');
    const merchants = tableResult(ownStore);
    createClient.mockResolvedValue({ from: vi.fn().mockReturnValue(merchants) });

    expect((await getClientContext()).merchant).toEqual(ownStore);
    expect(merchants.eq).toHaveBeenCalledExactlyOnceWith('owner_id', ownerId);
    expect(merchants.in).toHaveBeenCalledExactlyOnceWith('status', ['active', 'trial']);
    expect(cookies).not.toHaveBeenCalled();
  });

  it('resolves a superadmin selection through Supabase, including a suspended store', async () => {
    session('superadmin');
    const merchants = tableResult(suspendedStore);
    createClient.mockResolvedValue({ from: vi.fn().mockReturnValue(merchants) });

    expect((await getClientContext()).merchant).toEqual(suspendedStore);
    expect(merchants.eq).toHaveBeenCalledExactlyOnceWith('id', otherStoreId);
  });

  it('queries no store for a malformed selection or a role without dashboard access', async () => {
    session('superadmin');
    (await cookies()).get.mockReturnValue({ value: 'invalid' });
    expect((await getClientContext()).merchant).toBeNull();

    session(null);
    expect(await getClientContext()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe('dashboard store mutations', () => {
  it('lets only superadmins select a verified store', async () => {
    const form = new FormData();
    form.set('store_id', ownStore.id);
    const cookieStore = await cookies();

    session('owner');
    createClient.mockResolvedValue({ from: vi.fn().mockReturnValue(tableResult(ownStore)) });
    expect(await selectDashboardStoreAction(null, form)).toHaveProperty('error');
    expect(cookieStore.set).not.toHaveBeenCalled();

    session('superadmin');
    cookieStore.get.mockReturnValue(undefined);
    expect(await selectDashboardStoreAction(null, form)).toEqual({ success: true });
    expect(cookieStore.set).toHaveBeenCalledWith(
      DASHBOARD_STORE_COOKIE,
      ownStore.id,
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard', 'layout');
  });

  it('rejects stale mutation requests after a superadmin switches stores', async () => {
    session('superadmin');
    const from = vi.fn().mockReturnValue(tableResult(suspendedStore));
    createClient.mockResolvedValue({ from });

    expect(await refreshWeeklySummaryAction(ownStore.id)).toHaveProperty('error');
    expect(await updateFeedbackResolutionAction(feedbackId, true, ownStore.id)).toEqual({ success: false });
    expect(generateAndStoreSummary).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalledWith('customer_feedback');
  });

  it('scopes a resolution update to both the feedback ID and selected store', async () => {
    session('superadmin');
    const feedback = tableResult({ id: feedbackId });
    createClient.mockResolvedValue({
      from: (table) => table === 'customer_feedback' ? feedback : tableResult(suspendedStore),
    });

    expect(await updateFeedbackResolutionAction(feedbackId, true, otherStoreId)).toEqual({ success: true });
    expect(feedback.update).toHaveBeenCalledExactlyOnceWith({ resolved_status: true });
    expect(feedback.eq.mock.calls).toEqual([['id', feedbackId], ['store_id', otherStoreId]]);
  });
});
