'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { submitReviewAction } from '@/app/actions/review';
import { formatWhatsAppUrl } from '@/lib/whatsapp';

export const ratingLabels = [
  'Needs Improvement',
  'Fair',
  'Good',
  'Great Experience!',
  'Exceptional!',
];

/**
 * Extract clean uppercase initials for businesses without a usable logo.
 * @param {string} storeName
 * @returns {string}
 */
export function getStoreInitials(storeName) {
  if (!storeName || typeof storeName !== 'string') return 'RT';
  const parts = storeName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return storeName.trim().slice(0, 2).toUpperCase() || 'RT';
}

function recordStarTelemetry(cardId, star) {
  if (!cardId) return;

  const payload = JSON.stringify({ card_id: cardId, selected_stars: star });
  if (typeof navigator.sendBeacon === 'function') {
    try {
      if (
        navigator.sendBeacon(
          '/api/telemetry/star',
          new Blob([payload], { type: 'application/json' })
        )
      ) {
        return;
      }
    } catch {
      // Beacon delivery optional; keep interaction smooth
    }
  }

  fetch('/api/telemetry/star', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

function StarIcon({ className, filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={filled ? 0 : 1.75}
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96L12 2.5Z"
      />
    </svg>
  );
}

export default function RatingClientView({ card }) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedReview, setSavedReview] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [clipboardStatus, setClipboardStatus] = useState('idle'); // 'idle' | 'copied' | 'copying' | 'manual'
  const [logoFailed, setLogoFailed] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const submittingRef = useRef(false);
  const confirmationRef = useRef(null);
  const reviewTextRef = useRef(null);
  const redirectTimeoutRef = useRef(null);

  const storeName = card?.store_name || 'Our Business';

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (savedReview) {
      confirmationRef.current?.focus();
    }
  }, [savedReview]);

  const copyReview = async (text) => {
    if (!text) return;
    setClipboardStatus('copying');
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(text);
      setClipboardStatus('copied');
    } catch {
      // Graceful fallback to manual selection
      setClipboardStatus('manual');
    }
  };

  const handleRatingChange = (star) => {
    if (submittingRef.current || savedReview || isRedirecting) return;
    setSelectedRating(star);
    setSubmitError('');
    recordStarTelemetry(card?.id, star);

    // If 4 or 5 stars and destination URL is configured, trigger smooth redirect
    if (star >= 4 && card?.google_review_url) {
      setIsRedirecting(true);
      redirectTimeoutRef.current = setTimeout(() => {
        window.location.href = card.google_review_url;
      }, 400);
    }
  };

  const handleFeedbackSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current || savedReview) return;

    // Client-side validation: Star rating is required
    if (!selectedRating || selectedRating < 1 || selectedRating > 5) {
      setSubmitError('Please select a star rating (1 to 5) before submitting.');
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setHoverRating(0);
    setSubmitError('');

    const payload = {
      card_id: card?.id,
      rating: selectedRating,
      feedback_text: feedbackText.trim(),
    };

    try {
      let result = null;

      // Primary: invoke Next.js Server Action
      try {
        result = await submitReviewAction(payload);
      } catch {
        // Fallback: POST to API Route Handler
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        result = await response.json();
      }

      if (!result || result.success !== true) {
        throw new Error(
          result?.error || result?.message || 'Unable to submit your review. Please try again.'
        );
      }

      let googleReviewUrl = null;
      if (selectedRating >= 4 && result.next_action === 'google_review' && result.google_review_url) {
        try {
          const url = new URL(result.google_review_url);
          if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) {
            googleReviewUrl = url.href;
          }
        } catch {
          // Keep saved confirmation usable if URL parsing fails
        }
      }

      const savedText = typeof result.feedback_text === 'string' ? result.feedback_text : feedbackText.trim();

      setSavedReview({
        rating: selectedRating,
        text: savedText,
        googleReviewUrl,
      });

      // Auto-copy review text to clipboard for high ratings
      if (googleReviewUrl && savedText) {
        void copyReview(savedText);
      }
    } catch (err) {
      setSubmitError(err.message || 'Connection error. Please try submitting again.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const displayedRating = hoverRating || selectedRating;
  const isHighRating = selectedRating >= 4;

  const waUrl =
    card?.whatsapp_number && selectedRating > 0 && selectedRating <= 3
      ? formatWhatsAppUrl({
          phoneNumber: card.whatsapp_number,
          storeName,
          rating: selectedRating,
          feedbackText,
        })
      : null;

  return (
    <main className="flex min-h-svh w-full flex-1 flex-col items-center justify-center bg-radial from-stone-50 via-[#f4f6f2] to-[#e8ece5] px-4 py-8 text-stone-900 sm:py-12">
      {/* Live top pill */}
      <div className="mb-5 flex items-center gap-2 rounded-full border border-brand-900/10 bg-brand-50/80 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-brand-900">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
        </span>
        Every Experience Matters
      </div>

      <article className="relative w-full max-w-md overflow-hidden rounded-[2.25rem] border border-stone-200/90 bg-white/95 shadow-[0_20px_70px_-25px_rgba(20,50,30,0.18)] backdrop-blur-md transition-all">
        {/* Subtle decorative glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-linear-to-b from-brand-100/60 to-transparent blur-2xl"
        />

        {/* Header with Business Info */}
        <header className="relative border-b border-stone-100 bg-linear-to-b from-brand-50/50 to-white px-6 pb-6 pt-8 text-center sm:px-8">
          {card?.logo_url && !logoFailed ? (
            <Image
              src={card.logo_url}
              alt={`Logo ${storeName}`}
              width={76}
              height={76}
              unoptimized
              onError={() => setLogoFailed(true)}
              className="mx-auto mb-3.5 h-[76px] w-[76px] rounded-2xl border-2 border-white bg-white object-cover shadow-sm ring-1 ring-stone-200/70"
            />
          ) : (
            <div
              aria-hidden="true"
              className="mx-auto mb-3.5 flex h-[76px] w-[76px] items-center justify-center rounded-2xl border border-brand-800/10 bg-linear-to-br from-brand-900 to-brand-950 text-2xl font-bold tracking-tight text-white shadow-md ring-2 ring-brand-900/10"
            >
              {getStoreInitials(storeName)}
            </div>
          )}
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            {storeName}
          </h1>
          <p className="mt-1 text-xs text-stone-500">Thank you for visiting us!</p>
        </header>

        {/* Confirmation Screens vs Rating Form */}
        {isRedirecting ? (
          <section
            className="px-6 py-8 text-center sm:px-8 transition-all animate-in fade-in duration-200"
            aria-live="polite"
          >
            <div className="space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-500 shadow-sm ring-4 ring-amber-100/70 scale-105 transition-transform">
                <StarIcon className="h-9 w-9 animate-pulse" filled={true} />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-800 ring-1 ring-brand-600/20">
                  <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
                  {selectedRating} of 5 Stars · Exceptional!
                </span>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-stone-900">
                  Opening Google Reviews…
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Thank you for rating {storeName}! We are redirecting you to share your experience directly on Google.
                </p>
              </div>

              <div className="pt-2">
                <a
                  href={card?.google_review_url}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-brand-600 transition"
                >
                  <span>Continue to Google Reviews</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M7 7h10v10" />
                  </svg>
                </a>
                <p className="mt-2 text-[11px] text-stone-400">
                  Tap above if you are not automatically redirected.
                </p>
              </div>
            </div>
          </section>
        ) : savedReview ? (
          <section
            className="px-6 py-8 text-center sm:px-8 transition-all"
            aria-labelledby="confirmation-title"
          >
            {savedReview.googleReviewUrl ? (
              /* Case 4-5 Stars: Google Review Booster Transition Screen */
              <div className="space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-500 shadow-sm ring-4 ring-amber-100/70">
                  <StarIcon className="h-9 w-9" filled={true} />
                </div>

                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-800 ring-1 ring-brand-600/20">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Rating Saved · {savedReview.rating} of 5 Stars
                  </span>
                  <h2
                    ref={confirmationRef}
                    id="confirmation-title"
                    tabIndex={-1}
                    className="mt-3 text-2xl font-bold tracking-tight text-stone-900 outline-none"
                  >
                    Thank you for the wonderful rating!
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    We are thrilled you had a great experience! Would you take 10 seconds to share your review on Google?
                  </p>
                </div>

                {savedReview.text && (
                  <div className="rounded-2xl border border-stone-200/90 bg-stone-50/90 p-4 text-left shadow-xs">
                    <div className="flex items-center justify-between">
                      <label htmlFor="saved-review-text" className="text-xs font-bold text-stone-700">
                        Your Written Review
                      </label>
                      {clipboardStatus === 'copied' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700">
                          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Copied to clipboard!
                        </span>
                      )}
                    </div>

                    <textarea
                      ref={reviewTextRef}
                      id="saved-review-text"
                      value={savedReview.text}
                      readOnly
                      rows={3}
                      onFocus={(e) => e.target.select()}
                      className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-white p-3 text-sm leading-6 text-stone-700 outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                    />

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => copyReview(savedReview.text)}
                        disabled={clipboardStatus === 'copying'}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800 underline decoration-brand-800/40 underline-offset-4 hover:text-brand-950 focus-visible:outline-2 focus-visible:outline-brand-600"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {clipboardStatus === 'copied' ? 'Copy review again' : 'Copy review text'}
                      </button>

                      {clipboardStatus === 'manual' && (
                        <button
                          type="button"
                          onClick={() => {
                            reviewTextRef.current?.focus();
                            reviewTextRef.current?.select();
                          }}
                          className="text-xs font-medium text-stone-500 underline"
                        >
                          Select text
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <a
                    href={savedReview.googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-brand-900 to-brand-800 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-900/20 transition-all hover:from-brand-800 hover:to-brand-700 hover:shadow-brand-900/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600 active:scale-[0.99]"
                  >
                    <span>Post to Google Reviews</span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M7 7h10v10" />
                    </svg>
                  </a>
                  <p className="mt-2.5 text-xs text-stone-400">
                    Opens in a new tab. Paste your copied review and tap post!
                  </p>
                </div>
              </div>
            ) : (
              /* Case 1-3 Stars: Private Feedback Polite Confirmation Screen */
              <div className="space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-700 shadow-sm ring-4 ring-brand-100/70">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    className="h-8 w-8"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                  </svg>
                </div>

                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-800 ring-1 ring-brand-600/20">
                    Private Feedback Recorded
                  </span>
                  <h2
                    ref={confirmationRef}
                    id="confirmation-title"
                    tabIndex={-1}
                    className="mt-3 text-2xl font-bold tracking-tight text-stone-900 outline-none"
                  >
                    Thank you for your feedback!
                  </h2>
                  <p className="mt-2.5 text-sm leading-6 text-stone-600 font-medium">
                    Thank you for your feedback! We are constantly working to improve.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-stone-500">
                    Your comments have been privately sent directly to management. We appreciate your honesty and will use it to make our service better.
                  </p>
                </div>

                {/* Optional WhatsApp Resolution */}
                {waUrl && (
                  <div className="rounded-2xl border border-stone-200/90 bg-stone-50/80 p-4 text-left">
                    <p className="text-xs font-semibold text-stone-700">Need immediate assistance?</p>
                    <p className="mt-1 text-xs text-stone-500">
                      You can also chat directly with our store team on WhatsApp.
                    </p>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#20bd5a] transition-colors"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.43 0-2.82-.37-4.05-1.08l-.29-.17-3.12.82.83-3.04-.19-.3a8.214 8.214 0 0 1-1.26-4.46c0-4.54 3.7-8.24 8.24-8.24m4.52 11.63c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.53.61.2 1.16.17 1.6.11.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29" />
                      </svg>
                      Chat with Us on WhatsApp
                    </a>
                  </div>
                )}

                <p className="text-xs text-stone-400">
                  You may safely close this page now.
                </p>
              </div>
            )}
          </section>
        ) : (
          /* Main Interactive Rating Form */
          <form
            onSubmit={handleFeedbackSubmit}
            aria-busy={isSubmitting}
            className="px-5 pb-7 pt-6 sm:px-8"
          >
            <fieldset disabled={isSubmitting} className="min-w-0">
              <legend className="w-full text-center text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
                How was your experience?
              </legend>
              <p className="mt-1 text-center text-xs text-stone-500">
                Tap a star below to rate your visit
              </p>

              {/* 5-Star Rating Selector */}
              <div
                className="mt-6 flex justify-center gap-1.5 sm:gap-2.5"
                onMouseLeave={() => setHoverRating(0)}
                role="radiogroup"
                aria-label="5-Star Rating Selector"
                aria-describedby="rating-status-text"
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = displayedRating >= star;
                  const isCurrentSelected = selectedRating === star;

                  return (
                    <label
                      key={star}
                      onMouseEnter={() => !isSubmitting && setHoverRating(star)}
                      className="group relative block cursor-pointer rounded-2xl select-none"
                    >
                      <input
                        type="radio"
                        name="rating"
                        value={star}
                        checked={isCurrentSelected}
                        onChange={() => handleRatingChange(star)}
                        aria-label={`${star} star${star > 1 ? 's' : ''}: ${ratingLabels[star - 1]}`}
                        className="peer sr-only"
                      />
                      <span
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-150 sm:h-14 sm:w-14 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-700 peer-focus-visible:ring-offset-2 ${
                          isFilled
                            ? 'bg-amber-50 text-amber-400 shadow-xs ring-1 ring-amber-200/60 scale-105'
                            : 'text-stone-300 hover:bg-stone-50 hover:text-amber-200'
                        } motion-safe:active:scale-95`}
                      >
                        <StarIcon
                          className="h-8 w-8 sm:h-9 sm:w-9 transition-transform group-hover:scale-110"
                          filled={isFilled}
                        />
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Dynamic Sentiment Hint */}
              <p
                id="rating-status-text"
                aria-live="polite"
                className={`mt-3 min-h-5 text-center text-xs transition-colors ${
                  selectedRating
                    ? 'font-semibold text-brand-800'
                    : 'text-stone-400'
                }`}
              >
                {selectedRating
                  ? `${selectedRating} of 5 · ${ratingLabels[selectedRating - 1]}`
                  : 'Tap 1 to 5 stars to begin'}
              </p>

              {/* Dynamic Review Textarea (appears once star is selected) */}
              {selectedRating > 0 && (
                <div className="mt-5 border-t border-stone-100 pt-5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label
                      htmlFor="feedback-input"
                      className="text-xs font-bold text-stone-700"
                    >
                      {isHighRating ? 'Share your experience' : 'What can we improve?'}
                    </label>
                    <span className="text-[11px] font-medium text-stone-400">
                      Optional
                    </span>
                  </div>

                  <textarea
                    id="feedback-input"
                    rows={4}
                    maxLength={2000}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={
                      isHighRating
                        ? 'What did you enjoy most about your visit today?'
                        : 'Please let us know what went wrong and how we can do better...'
                    }
                    autoCapitalize="sentences"
                    spellCheck
                    aria-describedby="feedback-count"
                    className="block w-full resize-none rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 text-sm leading-6 text-stone-800 placeholder:text-stone-400 outline-none transition-all focus:border-brand-700 focus:bg-white focus:ring-2 focus:ring-brand-700/15"
                  />

                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-stone-400">
                    <span>
                      {isHighRating
                        ? 'You will have the option to post this to Google.'
                        : 'Sent privately to management.'}
                    </span>
                    <span id="feedback-count" className="tabular-nums">
                      {feedbackText.length}/2000
                    </span>
                  </div>
                </div>
              )}

              {/* Client-Side Error Alert */}
              {submitError && (
                <div
                  role="alert"
                  className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs font-medium text-rose-800"
                >
                  <svg className="h-4 w-4 shrink-0 text-rose-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit Review Button & WhatsApp Escalation */}
              <div className="mt-6 space-y-2.5">
                <button
                  type="submit"
                  disabled={!selectedRating || isSubmitting}
                  className="relative flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-brand-950/20 transition-all hover:bg-brand-600 hover:shadow-brand-950/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                      />
                      <span>Submitting Feedback…</span>
                    </>
                  ) : (
                    <span>{selectedRating <= 3 ? 'Submit Private Feedback' : 'Submit Review'}</span>
                  )}
                </button>

                {waUrl && selectedRating <= 3 && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-xs font-semibold text-white shadow-xs hover:bg-[#20bd5a] transition-colors"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.43 0-2.82-.37-4.05-1.08l-.29-.17-3.12.82.83-3.04-.19-.3a8.214 8.214 0 0 1-1.26-4.46c0-4.54 3.7-8.24 8.24-8.24m4.52 11.63c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.53.61.2 1.16.17 1.6.11.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29" />
                    </svg>
                    <span>Chat Directly with Manager on WhatsApp</span>
                  </a>
                )}
              </div>

              <p className="mt-4 text-center text-[11px] text-stone-400">
                Your feedback goes directly to {storeName}.
              </p>
            </fieldset>
          </form>
        )}
      </article>

      <footer className="mt-6 text-center text-xs text-stone-400">
        Powered by Filter-Rating NFC
      </footer>
    </main>
  );
}
