import { headers } from 'next/headers';
import { after, connection } from 'next/server';
import { redirect } from 'next/navigation';
import { getCardBySlug } from '@/lib/db';
import { queueTapTelemetry } from '@/lib/logger';
import { getClientMeta } from '@/lib/client-meta';
import { resolveCardAction } from '@/lib/resolve-card-action';
import { resolveActiveCardMode } from '@/lib/card-mode';
import { parseAttribution, buildAttributedUrl } from '@/lib/attribution';
import { sanitizeReviewUrl } from '@/lib/validation';
import RatingClientView from '@/app/r/[slug]/RatingClientView';
import PromoView from '@/app/r/[slug]/PromoView';
import FallbackView from '@/app/r/[slug]/FallbackView';

/** Allow request-time headers/DB access on this blocking NFC hot path (Next.js cacheComponents). */
export const instant = false;

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

export default async function CardRoutePage({ params, searchParams }) {
  await connection();
  const { slug } = await params;
  const query = (await searchParams) || {};

  const headerList = await headers();
  const { clientIp, userAgent, referrer } = getClientMeta(headerList);

  const attribution = parseAttribution(query);
  const view = Array.isArray(query.view) ? query.view[0] : query.view;
  const forceReview = view === 'review';

  const card = await getCardBySlug(slug);
  const action = resolveCardAction(card, { forceReview });

  if (action.type === 'fallback') {
    redirect(`/invalid-card?slug=${encodeURIComponent(slug || '')}`);
  }

  const isPrefetch = headerList.has('next-router-prefetch')
    || headerList.get('purpose') === 'prefetch'
    || headerList.get('sec-purpose')?.includes('prefetch');
  // "Rate your visit" from the promo page is the same visit, not a new tap.
  const cameFromPromo = forceReview && resolveActiveCardMode(card) === 'promo';

  if (!isPrefetch && !cameFromPromo) {
    scheduleTapTelemetry({
      cardId: card.id,
      clientIp,
      userAgent,
      referrer,
      staffCode: attribution.staffCode,
      tableCode: attribution.tableCode,
    });
  }

  if (action.type === 'mode_redirect') {
    redirect(action.url);
  }

  if (action.type === 'direct_redirect') {
    const destinationUrl = sanitizeReviewUrl(action.url) || action.url;
    redirect(destinationUrl);
  }

  if (action.type === 'promo') {
    return (
      <PromoView
        card={{
          store_name: card.store_name,
          logo_url: card.logo_url,
          promo_title: card.promo_title,
          promo_message: card.promo_message,
          promo_image_url: sanitizeReviewUrl(card.promo_image_url || ''),
          promo_cta_label: card.promo_cta_label,
          promo_url: sanitizeReviewUrl(card.promo_url || ''),
          mode_until: card.mode_until,
        }}
        reviewHref={buildAttributedUrl(`/r/${encodeURIComponent(card.slug)}?view=review`, {
          staff: attribution.staffCode,
          table: attribution.tableCode,
        })}
      />
    );
  }

  return (
    <RatingClientView
      card={{
        id: card.id,
        store_name: card.store_name,
        logo_url: card.logo_url,
        google_review_url: sanitizeReviewUrl(card.google_review_url || ''),
        whatsapp_number: card.whatsapp_number,
      }}
      attribution={attribution}
    />
  );
}
