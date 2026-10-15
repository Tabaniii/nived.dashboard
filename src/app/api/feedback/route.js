import { NextResponse } from 'next/server';
import { isValidUUID, isValidRating, sanitizeText } from '@/lib/validation';
import { getCardById, createFeedback } from '@/lib/db';
import { getReviewOutcome } from '@/lib/review-routing';
import { sanitizeStaffCode, sanitizeTableCode } from '@/lib/attribution';
import { scheduleLowRatingAlert } from '@/lib/alerts';
import { getClientMeta } from '@/lib/client-meta';
import { hashIp } from '@/lib/debounce';

/**
 * POST /api/feedback
 * Records customer ratings and optional internal feedback for 1-5 stars.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const { card_id, rating, feedback_text, customer_whatsapp, staff_code, table_code } = body || {};

  // 1. Validate card_id (must be valid UUID format)
  if (!card_id || !isValidUUID(card_id)) {
    return NextResponse.json(
      { error: 'Validation error', message: 'Valid card_id (UUID) is required' },
      { status: 400 }
    );
  }

  // 2. Validate rating (strictly integer between 1 and 5)
  if (!isValidRating(rating, 1, 5)) {
    return NextResponse.json(
      {
        error: 'Validation error',
        message: 'Rating must be an integer between 1 and 5',
      },
      { status: 400 }
    );
  }

  if (feedback_text != null && typeof feedback_text !== 'string') {
    return NextResponse.json(
      { error: 'Validation error', message: 'Feedback must be text' },
      { status: 400 }
    );
  }

  // 3. Verify card exists (and is not soft-deleted)
  const card = await getCardById(card_id.trim());
  if (!card) {
    return NextResponse.json(
      { error: 'Card not found', message: 'The referenced card does not exist' },
      { status: 404 }
    );
  }

  // 4. Sanitize feedback text + optional customer WhatsApp
  const sanitizedText = sanitizeText(feedback_text || '', 2000);
  const sanitizedWa = sanitizeText(customer_whatsapp || '', 30).replace(
    /[^\d+]/g,
    ''
  );

  // 5. Persist to database
  try {
    const feedback = await createFeedback({
      card_id: card.id,
      rating: Number(rating),
      feedback_text: sanitizedText,
      customer_whatsapp: sanitizedWa || null,
      staff_code: sanitizeStaffCode(staff_code),
      table_code: sanitizeTableCode(table_code),
    });

    if (!feedback) {
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to record feedback' },
        { status: 500 }
      );
    }

    scheduleLowRatingAlert({
      card,
      feedback,
      sourceKey: hashIp(getClientMeta(request.headers).clientIp),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Feedback submitted successfully',
        id: feedback.id,
        feedback_text: sanitizedText,
        ...getReviewOutcome(Number(rating), card.google_review_url),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/feedback] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Database error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
