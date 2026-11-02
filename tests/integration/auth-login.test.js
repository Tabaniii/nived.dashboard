import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { loginAction } from '@/app/(auth)/actions';
import { POST } from '@/app/api/auth/login/route';

describe('dashboard login failures', () => {
  let signInWithPassword;
  let from;

  beforeEach(() => {
    vi.resetAllMocks();
    signInWithPassword = vi.fn();
    from = vi.fn();
    createClient.mockResolvedValue({ auth: { signInWithPassword }, from });
  });

  it.each([
    [{ name: 'AuthRetryableFetchError', status: 0 }, 503, 'Tidak dapat terhubung'],
    [{ name: 'AuthRetryableFetchError', status: 503 }, 503, 'Tidak dapat terhubung'],
    [{ code: 'invalid_credentials', status: 400 }, 401, 'Email atau password salah.'],
    [{ status: 429 }, 429, 'Terlalu banyak percobaan'],
    [{ code: 'email_not_confirmed', status: 400 }, 403, 'belum dikonfirmasi'],
    [{ status: 401, message: 'private upstream detail' }, 502, 'Login belum berhasil'],
  ])('handles %j consistently in the form and API', async (error, status, message) => {
    signInWithPassword.mockResolvedValue({ data: { user: null }, error });
    const form = new FormData();
    form.set('email', ' test@example.invalid ');
    form.set('password', 'test-password');

    const actionResult = await loginAction(form);
    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form)),
    }));
    const body = await response.json();

    expect(response.status).toBe(status);
    expect(body).toEqual(actionResult);
    expect(body.error).toContain(message);
    expect(JSON.stringify(body)).not.toContain('private upstream detail');
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.invalid', password: 'test-password',
    });
    expect(from).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
