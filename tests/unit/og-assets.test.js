import { describe, it, expect, vi } from 'vitest';
import { fetchImageAsDataUrl, isSafeRemoteImageUrl, loadOgFonts } from '@/lib/og/assets';

describe('isSafeRemoteImageUrl', () => {
  it('accepts public https URLs', () => {
    expect(
      isSafeRemoteImageUrl('https://xyz.supabase.co/storage/v1/object/public/logos/kopi.png')
    ).toBe(true);
  });

  it('rejects non-https, local and IP-literal hosts', () => {
    for (const url of [
      'http://cdn.example.com/logo.png',
      'https://localhost/logo.png',
      'https://127.0.0.1/logo.png',
      'https://2130706433/logo.png',
      'https://169.254.169.254/latest/meta-data',
      'https://[::1]/logo.png',
      'https://printer.local/logo.png',
      'javascript:alert(1)',
      '',
      null,
    ]) {
      expect(isSafeRemoteImageUrl(url), String(url)).toBe(false);
    }
  });
});

describe('fetchImageAsDataUrl', () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  it('returns a data URL for PNG/JPEG responses without following redirects', async () => {
    const fetchImpl = vi.fn(async () => new Response(png, { headers: { 'content-type': 'image/png' } }));

    await expect(
      fetchImageAsDataUrl('https://cdn.example.com/logo.png', { fetchImpl })
    ).resolves.toBe(`data:image/png;base64,${Buffer.from(png).toString('base64')}`);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://cdn.example.com/logo.png',
      expect.objectContaining({ redirect: 'error' })
    );
  });

  it('normalizes image/jpg to image/jpeg', async () => {
    const fetchImpl = vi.fn(async () => new Response(png, { headers: { 'content-type': 'image/jpg' } }));
    const result = await fetchImageAsDataUrl('https://cdn.example.com/logo.jpg', { fetchImpl });
    expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);
  });

  it('returns null for unsupported types, HTTP errors, network errors and unsafe URLs', async () => {
    const svg = vi.fn(async () => new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } }));
    await expect(fetchImageAsDataUrl('https://cdn.example.com/logo.svg', { fetchImpl: svg })).resolves.toBeNull();

    const notFound = vi.fn(
      async () => new Response('nope', { status: 404, headers: { 'content-type': 'image/png' } })
    );
    await expect(fetchImageAsDataUrl('https://cdn.example.com/logo.png', { fetchImpl: notFound })).resolves.toBeNull();

    const failing = vi.fn(async () => {
      throw new Error('ENOTFOUND');
    });
    await expect(fetchImageAsDataUrl('https://cdn.example.com/logo.png', { fetchImpl: failing })).resolves.toBeNull();

    const never = vi.fn();
    await expect(fetchImageAsDataUrl('http://127.0.0.1/logo.png', { fetchImpl: never })).resolves.toBeNull();
    expect(never).not.toHaveBeenCalled();
  });

  it('rejects images over 3 MB', async () => {
    const big = vi.fn(
      async () =>
        new Response(new Uint8Array(3 * 1024 * 1024 + 1), { headers: { 'content-type': 'image/jpeg' } })
    );
    await expect(fetchImageAsDataUrl('https://cdn.example.com/big.jpg', { fetchImpl: big })).resolves.toBeNull();
  });
});

describe('loadOgFonts', () => {
  it('loads the bundled Plus Jakarta Sans weights', async () => {
    const fonts = await loadOgFonts();
    expect(fonts.map((font) => font.weight)).toEqual([400, 700, 800]);
    for (const font of fonts) {
      expect(font.name).toBe('Plus Jakarta Sans');
      expect(font.data.byteLength).toBeGreaterThan(10_000);
    }
  });
});
