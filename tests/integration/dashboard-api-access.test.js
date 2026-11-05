import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getAnalytics } from '@/app/api/dashboard/analytics/route';
import { GET as getOverview } from '@/app/api/dashboard/overview/route';
import { GET as getSettings, PATCH as patchSettings } from '@/app/api/dashboard/settings/route';
import { updateCardSettingsAction } from '@/app/(dashboard)/dashboard/actions';
import { getClientCards, getClientContext, getClientDashboardData } from '@/app/(dashboard)/dashboard/queries';

vi.mock('@/app/(dashboard)/dashboard/actions', () => ({ updateCardSettingsAction: vi.fn() }));
vi.mock('@/app/(dashboard)/dashboard/queries', () => ({
  getClientCards: vi.fn(),
  getClientContext: vi.fn(),
  getClientDashboardData: vi.fn(),
}));

const storeId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otherStoreId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function request(path, options) {
  return new Request(`https://example.invalid/api/dashboard/${path}`, options);
}

beforeEach(() => {
  vi.resetAllMocks();
  getClientContext.mockResolvedValue({
    merchant: { id: storeId, status: 'active' },
    profile: { merchant_id: otherStoreId, dashboard_role: 'owner' },
  });
});

describe('dashboard API store scope', () => {
  it.each([
    ['analytics', getAnalytics],
    ['overview', getOverview],
    ['settings', getSettings],
  ])('rejects a mismatched %s store before reading data', async (path, handler) => {
    const response = await handler(request(`${path}?store_id=${otherStoreId}`));

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(getClientDashboardData).not.toHaveBeenCalled();
    expect(getClientCards).not.toHaveBeenCalled();
  });

  it('reads analytics using verified store ownership instead of legacy POS membership', async () => {
    getClientDashboardData.mockResolvedValue({ daily: [], weekly: [], peakHours: [], kpi: {} });

    const response = await getAnalytics(request(`analytics?store_id=${storeId}`));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(getClientDashboardData).toHaveBeenCalledExactlyOnceWith(storeId, false);
  });

  it('rejects requests with no authorized dashboard session', async () => {
    getClientContext.mockResolvedValue(null);

    expect((await getOverview(request('overview'))).status).toBe(401);
    expect(getClientDashboardData).not.toHaveBeenCalled();
  });

  it('rejects a forged store assignment in settings mutations', async () => {
    const response = await patchSettings(request('settings', {
      method: 'PATCH',
      body: JSON.stringify({ store_id: otherStoreId }),
    }));

    expect(response.status).toBe(403);
    expect(updateCardSettingsAction).not.toHaveBeenCalled();
  });

  it('passes only the verified store to the settings action', async () => {
    updateCardSettingsAction.mockResolvedValue({ success: true });

    const response = await patchSettings(request('settings', {
      method: 'PATCH',
      body: JSON.stringify({ card_id: 'card', store_id: storeId }),
    }));

    expect(response.status).toBe(200);
    expect(updateCardSettingsAction).toHaveBeenCalledExactlyOnceWith(expect.any(FormData), storeId);
    expect(updateCardSettingsAction.mock.calls[0][0].has('google_review_url')).toBe(false);
  });
});
