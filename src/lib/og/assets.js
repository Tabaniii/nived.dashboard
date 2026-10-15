import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const FONT_DIR = join(process.cwd(), 'src/assets/fonts');
const FONT_FILES = [
  ['Regular', 400],
  ['Bold', 700],
  ['ExtraBold', 800],
];

// Satori decodes PNG/JPEG reliably; WebP/SVG logos fall back to initials.
const IMAGE_TYPES = new Map([
  ['image/png', 'image/png'],
  ['image/jpeg', 'image/jpeg'],
  ['image/jpg', 'image/jpeg'],
]);
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

let fontsPromise;

/**
 * @returns {Promise<Array<{ name: string, data: Buffer, weight: number, style: 'normal' }>>}
 */
export function loadOgFonts() {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async ([file, weight]) => ({
      name: 'Plus Jakarta Sans',
      data: await readFile(join(FONT_DIR, `PlusJakartaSans-${file}.ttf`)),
      weight,
      style: 'normal',
    }))
  ).catch((err) => {
    fontsPromise = undefined;
    throw err;
  });
  return fontsPromise;
}

/**
 * Only public https hosts: logo URLs are fetched server-side.
 * @param {unknown} value
 */
export function isSafeRemoteImageUrl(value) {
  if (typeof value !== 'string' || !value) return false;

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();
  if (!host || host === 'localhost') return false;
  if (['.localhost', '.local', '.internal'].some((suffix) => host.endsWith(suffix))) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[') || host.includes(':')) return false;
  return true;
}

/**
 * Fetch a logo and inline it, so a slow or broken image host never fails the render.
 *
 * @param {string} url
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} [options]
 * @returns {Promise<string|null>}
 */
export async function fetchImageAsDataUrl(url, { fetchImpl = fetch, timeoutMs = 4000 } = {}) {
  if (!isSafeRemoteImageUrl(url)) return null;

  try {
    const res = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;

    const rawType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const type = IMAGE_TYPES.get(rawType);
    if (!type) return null;
    if (Number(res.headers.get('content-length')) > MAX_IMAGE_BYTES) return null;

    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return null;
    return `data:${type};base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
}
