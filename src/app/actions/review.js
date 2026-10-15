'use server';

import { headers } from 'next/headers';
import { isValidUUID, isValidRating, sanitizeText } from '@/lib/validation';
import { getCardById, createFeedback } from '@/lib/db';
import { getReviewOutcome } from '@/lib/review-routing';
import { sanitizeStaffCode, sanitizeTableCode } from '@/lib/attribution';
import { isLowRating, scheduleLowRatingAlert } from '@/lib/alerts';
import { getClientMeta } from '@/lib/client-meta';
import { hashIp } from '@/lib/debounce';

async function getRequestSourceKey() {
  try {
    return hashIp(getClientMeta(await headers()).clientIp);
  } catch {
    return '';
  }
}

/**
 * Server Action for saving customer review and resolving smart routing.
 * Can be invoked directly from Client Components or server forms.
 *
 * @param {Object} params
 * @param {string} params.card_id
 * @param {number} params.rating
 * @param {string} [params.feedback_text]
 * @param {string} [params.customer_whatsapp]
 * @param {string} [params.staff_code]
 * @param {string} [params.table_code]
 * @returns {Promise<{
 *   success: boolean,
 *   message?: string,
 *   id?: number|string,
 *   feedback_text?: string,
 *   next_action?: 'google_review'|'private_confirmation',
 *   google_review_url?: string,
 *   error?: string
 * }>}
 */
export async function submitReviewAction({
  card_id,
  rating,
  feedback_text = '',
  customer_whatsapp = '',
  staff_code = '',
  table_code = '',
}) {
  if (!card_id || !isValidUUID(card_id)) {
    return {
      success: false,
      error: 'Valid card_id (UUID) is required',
    };
  }

  const numericRating = Number(rating);
  if (!isValidRating(numericRating, 1, 5)) {
    return {
      success: false,
      error: 'Rating must be an integer between 1 and 5',
    };
  }

  if (feedback_text != null && typeof feedback_text !== 'string') {
    return {
      success: false,
      error: 'Feedback must be text',
    };
  }

  const card = await getCardById(card_id.trim());
  if (!card) {
    return {
      success: false,
      error: 'The referenced card does not exist',
    };
  }

  const sanitizedText = sanitizeText(feedback_text || '', 2000);
  const sanitizedWa = sanitizeText(customer_whatsapp || '', 30).replace(/[^\d+]/g, '');

  try {
    const feedback = await createFeedback({
      card_id: card.id,
      rating: numericRating,
      feedback_text: sanitizedText,
      customer_whatsapp: sanitizedWa || null,
      staff_code: sanitizeStaffCode(staff_code),
      table_code: sanitizeTableCode(table_code),
    });

    if (!feedback) {
      return {
        success: false,
        error: 'Failed to record feedback in database',
      };
    }

    if (isLowRating(numericRating)) {
      scheduleLowRatingAlert({ card, feedback, sourceKey: await getRequestSourceKey() });
    }

    return {
      success: true,
      message: 'Feedback submitted successfully',
      id: feedback.id,
      feedback_text: sanitizedText,
      ...getReviewOutcome(numericRating, card.google_review_url),
    };
  } catch (err) {
    console.error('[actions/review] Error persisting review:', err);
    return {
      success: false,
      error: 'An unexpected database error occurred',
    };
  }
}
