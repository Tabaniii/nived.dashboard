import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getClientContext } from '@/app/(dashboard)/dashboard/queries';
import { updateCardSettingsAction, updateStoreReviewLinkAction } from '@/app/(dashboard)/dashboard/actions';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/app/(dashboard)/dashboard/queries', () => ({ getClientContext: vi.fn() }));

const storeId = '11111111-1111-1111-1111-111111111111';
const cardId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const reviewUrl = 'https://g.page/r/kopi-titik-temu/review';
let query;

function form(url = reviewUrl) {
  const data = new FormData();
  data.set('google_review_url', url);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  getClientContext.mockResolvedValue({ merchant: { id: storeId } });
  query = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({ data: [{ id: cardId }, { id: 'second-card' }], error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: cardId }, error: null }),
  };
  createClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
});

describe('store-wide Google review link', () => {
  it('updates only the review destination across the verified store and invalidates public cards', async () => {
    expect(await updateStoreReviewLinkAction(form(), storeId)).toEqual({ success: true });
    expect(query.update).toHaveBeenCalledExactlyOnceWith({ google_review_url: reviewUrl });
    expect(query.eq).toHaveBeenCalledExactlyOnceWith('merchant_id', storeId);
    expect(query.is).toHaveBeenCalledExactlyOnceWith('deleted_at', null);
    expect(revalidatePath).toHaveBeenCalledWith('/r/[slug]', 'page');
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/settings');
  });

  it('denies a forged store and expired session before touching the database', async () => {
    expect(await updateStoreReviewLinkAction(form(), cardId)).toHaveProperty('error');
    getClientContext.mockResolvedValue(null);
    expect(await updateStoreReviewLinkAction(form(), storeId)).toHaveProperty('error');
    expect(createClient).not.toHaveBeenCalled();
  });

  it.each(['', 'javascript:alert(1)', 'https://g.page.evil.example/r/cafe/review'])('rejects an invalid destination: %s', async url => {
    expect(await updateStoreReviewLinkAction(form(url), storeId)).toHaveProperty('error');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('does not report success when RLS denies the update or no cards exist', async () => {
    query.select.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    expect(await updateStoreReviewLinkAction(form(), storeId)).toEqual({ error: 'permission denied' });
    query.select.mockResolvedValue({ data: [], error: null });
    expect(await updateStoreReviewLinkAction(form(), storeId)).toHaveProperty('error');
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('keeps the new review link and contact unchanged when general settings omit them', async () => {
    query.select.mockReturnValue(query);
    const data = new FormData();
    data.set('card_id', cardId);
    data.set('store_name', 'Kopi Titik Temu');
    expect(await updateCardSettingsAction(data, storeId)).toEqual({ success: true });
    expect(query.update).toHaveBeenCalledExactlyOnceWith({ store_name: 'Kopi Titik Temu' });
    expect(query.eq).toHaveBeenCalledWith('id', cardId);
    expect(query.eq).toHaveBeenCalledWith('merchant_id', storeId);
  });

  it('still rejects an explicitly empty review URL in a settings API update', async () => {
    const data = form('');
    data.set('card_id', cardId);
    expect(await updateCardSettingsAction(data, storeId)).toHaveProperty('error');
    expect(createClient).not.toHaveBeenCalled();
  });
});
