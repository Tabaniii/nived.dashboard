/** Resolve the next step only after a review has been saved successfully. */
export function getReviewOutcome(rating, googleReviewUrl) {
  if (rating >= 4 && rating <= 5 && typeof googleReviewUrl === 'string') {
    try {
      const url = new URL(googleReviewUrl);
      if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) {
        return {
          next_action: 'google_review',
          google_review_url: url.href,
        };
      }
    } catch {
      // A missing or malformed destination must not invalidate a saved review.
    }
  }

  return { next_action: 'private_confirmation' };
}
