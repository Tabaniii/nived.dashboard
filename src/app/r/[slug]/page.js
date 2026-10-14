import { headers } from 'next/headers';
import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { getCardBySlug } from '@/lib/db';
import { queueTapTelemetry } from '@/lib/logger';
import { getClientMeta } from '@/lib/client-meta';
import { resolveCardAction } from '@/lib/resolve-card-action';
import { sanitizeReviewUrl } from '@/lib/validation';
import RatingClientView from '@/app/r/[slug]/RatingClientView';
import FallbackView from '@/app/r/[slug]/FallbackView';

/** Allow request-time headers/DB access on this blocking NFC hot path (Next.js cacheComponents). */
export const instant = false;

/**
 * Schedule debounced tap telemetry after the response is sent (non-blocking TTFB).
 * @param {{ cardId: string, clientIp: string, userAgent: string, referrer?: string }} meta
 */
function scheduleTapTelemetry(meta) {
  const pending = queueTapTelemetry(meta);
  if (!pending) return;

  after(async () => {
    try {
      await pending;
    } catch (err) {
      console.error('[r/slug] Deferred tap telemetry failed:', err);
    }
  });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const card = await getCardBySlug(slug);

  if (!card) {
    return {
      title: 'Card not registered',
      description: 'The requested NFC review card is not registered or currently unavailable.',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${card.store_name} — Rate Your Experience`,
    description: `Share your experience and review for ${card.store_name}.`,
  };
}

export default async function CardRoutePage({ params }) {
  const { slug } = await params;

  const headerList = await headers();
  const { clientIp, userAgent, referrer } = getClientMeta(headerList);

  const card = await getCardBySlug(slug);
  const action = resolveCardAction(card);

  if (action.type === 'fallback') {
    redirect(`/invalid-card?slug=${encodeURIComponent(slug || '')}`);
  }

  const isPrefetch = headerList.has('next-router-prefetch')
    || headerList.get('purpose') === 'prefetch'
    || headerList.get('sec-purpose')?.includes('prefetch');

  if (!isPrefetch) {
    scheduleTapTelemetry({ cardId: card.id, clientIp, userAgent, referrer });
  }

  if (action.type === 'direct_redirect') {
    const destinationUrl = sanitizeReviewUrl(action.url) || action.url;
    redirect(destinationUrl);
  }

  return (
    <RatingClientView
      card={{
        id: card.id,
        store_name: card.store_name,
        logo_url: card.logo_url,
        google_review_url: card.google_review_url,
        whatsapp_number: card.whatsapp_number,
      }}
    />
  );
}
