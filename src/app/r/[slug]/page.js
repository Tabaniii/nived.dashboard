import { headers } from 'next/headers';
import { after, NextResponse } from 'next/server';
import { getCardBySlug } from '@/lib/db';
import { queueTapTelemetry } from '@/lib/logger';
import { getClientMeta } from '@/lib/client-meta';
import { resolveCardAction } from '@/lib/resolve-card-action';
import RatingClientView from './RatingClientView';
import FallbackView from './FallbackView';

/** Allow request-time headers/DB access on this blocking NFC hot path (Next.js cacheComponents). */
export const instant = false;

/**
 * Schedule debounced tap telemetry after the response is sent (non-blocking TTFB).
 * @param {{ cardId: string, clientIp: string, userAgent: string }} meta
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
      title: 'Card Not Found — Reputation Shield',
      description: 'Physical NFC card review page',
    };
  }

  return {
    title: `${card.store_name} — Rate & Review`,
    description: `Share your experience at ${card.store_name}`,
  };
}

export default async function CardRoutePage({ params }) {
  const { slug } = await params;

  const headerList = await headers();
  const { clientIp, userAgent } = getClientMeta(headerList);

  const card = await getCardBySlug(slug);
  const action = resolveCardAction(card);

  if (action.type === 'fallback') {
    return <FallbackView slug={slug} />;
  }

  scheduleTapTelemetry({
    cardId: action.type === 'shield_ui' ? action.card.id : card.id,
    clientIp,
    userAgent,
  });

  // Direct Mode: explicit HTTP 307 Temporary Redirect (no HTML shell)
  if (action.type === 'direct_redirect') {
    return NextResponse.redirect(action.url, action.status);
  }

  // Shield Mode: render rating UI (front-end owns the view)
  return <RatingClientView card={action.card} />;
}
