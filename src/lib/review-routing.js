import { sanitizeReviewUrl } from './validation';

/** Resolve the next step only after a review has been saved successfully. */
export function getReviewOutcome(rating, googleReviewUrl) {
  if (rating >= 4 && rating <= 5) {
    const cleanUrl = sanitizeReviewUrl(googleReviewUrl);
    if (cleanUrl) {
      return {
        next_action: 'google_review',
        google_review_url: cleanUrl,
      };
    }
  }

  return { next_action: 'private_confirmation' };
}
