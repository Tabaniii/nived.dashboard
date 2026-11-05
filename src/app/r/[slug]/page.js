import { headers } from 'next/headers';
import { after, connection } from 'next/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getCardBySlug } from '@/lib/db';
import { queueTapTelemetry } from '@/lib/logger';
import { getClientMeta } from '@/lib/client-meta';
import { resolveCardAction } from '@/lib/resolve-card-action';
import { parseAttribution } from '@/lib/attribution';
import { getSavedGoogleReviewDestination, resolveTableNumber } from '@/lib/customer-feedback';
import { sanitizeReviewUrl } from '@/lib/validation';
import RatingClientView from '@/app/r/[slug]/RatingClientView';

/** Allow request-time headers/DB access on this blocking NFC hot path (Next.js cacheComponents). */
export const instant = false;

const getTapCard = cache(getCardBySlug);

/**
 * Schedule debounced tap telemetry after the response is sent (non-blocking TTFB).
 * @param {{ cardId: string, clientIp: string, userAgent: string, referrer?: string, staffCode?: string|null, tableCode?: string|null }} meta
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
  const card = await getTapCard(slug);

  if (resolveCardAction(card).type === 'fallback') {
    return {
      title: 'Card not registered',
      description: 'The requested NFC review card is not registered or currently unavailable.',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${card.store_name} — Bagikan Pengalaman Anda`,
    description: `Share your experience and review for ${card.store_name}.`,
  };
}

export default async function CardRoutePage({ params, searchParams }) {
  await connection();
  const { slug } = await params;
  const [query, headerList, card] = await Promise.all([searchParams, headers(), getTapCard(slug)]);

  const { clientIp, userAgent, referrer } = getClientMeta(headerList);

  const attribution = parseAttribution(query);
  const action = resolveCardAction(card);

  if (action.type === 'fallback') {
    redirect(`/invalid-card?slug=${encodeURIComponent(slug || '')}`);
  }

  const tableNumber = resolveTableNumber(card.slug, attribution.tableCode);
  const isPrefetch = headerList.has('next-router-prefetch')
    || headerList.get('purpose') === 'prefetch'
    || headerList.get('sec-purpose')?.includes('prefetch');
  if (!isPrefetch) {
    scheduleTapTelemetry({
      cardId: card.id,
      clientIp,
      userAgent,
      referrer,
      staffCode: attribution.staffCode,
      tableCode: tableNumber,
    });
  }

  return (
    <RatingClientView
      card={{
        id: card.id,
        store_name: card.store_name,
        logo_url: sanitizeReviewUrl(card.logo_url),
        google_review_url: getSavedGoogleReviewDestination(card),
      }}
      tableNumber={tableNumber}
      promo={action.mode === 'review' ? null : {
        title: action.mode === 'promo' ? card.promo_title : null,
        message: action.mode === 'promo' ? card.promo_message : null,
        image: action.mode === 'promo' ? sanitizeReviewUrl(card.promo_image_url) : null,
        label: card.promo_cta_label,
        url: sanitizeReviewUrl(card.promo_url),
      }}
    />
  );
}
