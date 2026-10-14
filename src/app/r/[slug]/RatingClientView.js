'use client';

import { useState } from 'react';
import Image from 'next/image';
import { formatWhatsAppUrl } from '@/lib/whatsapp';

/**
 * Extract clean 2-letter uppercase initials from a store name.
 * @param {string} [storeName]
 * @returns {string}
 */
export function getStoreInitials(storeName) {
  if (!storeName || typeof storeName !== 'string') return 'RT';
  const parts = storeName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return storeName.trim().slice(0, 2).toUpperCase() || 'RT';
}

/**
 * Dispatch star selection telemetry non-blockingly.
 * Uses navigator.sendBeacon when available to ensure delivery during redirects,
 * with graceful fallback to fetch keepalive.
 *
 * @param {string} cardId
 * @param {number} star
 */
function recordStarTelemetry(cardId, star) {
  if (!cardId) return;

  const payload = JSON.stringify({
    card_id: cardId,
    selected_stars: star,
  });

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon('/api/telemetry/star', blob)) {
        return;
      }
    } catch {
      // Fall through to fetch
    }
  }

  fetch('/api/telemetry/star', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch((err) => {
    console.error('[client] Star telemetry failed:', err);
  });
}

export default function RatingClientView({ card }) {
  const [selectedRating, setSelectedRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleStarClick = (star) => {
    if (isSubmitting) return;

    setSelectedRating(star);
    recordStarTelemetry(card?.id, star);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRating || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: card?.id,
          rating: selectedRating,
          feedback_text: feedbackText.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Gagal mengirim masukan. Silakan coba lagi.');
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('[client] Feedback error:', err);
      setSubmitError(err.message || 'Terjadi gangguan saat mengirim masukan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const waUrl = card?.whatsapp_number
    ? formatWhatsAppUrl({
        phoneNumber: card.whatsapp_number,
        storeName: card.store_name,
        rating: selectedRating || 1,
        feedbackText,
      })
    : null;

  const storeInitials = getStoreInitials(card?.store_name);

  return (
    <main className="max-w-md mx-auto min-h-screen px-4 py-8 flex flex-col justify-center items-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="w-full p-6 sm:p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200/80 dark:border-zinc-800 text-center">
        {/* Store Header */}
        <div className="mb-6">
          {card?.logo_url ? (
            <Image
              src={card.logo_url}
              alt={card.store_name || 'Store Logo'}
              width={64}
              height={64}
              unoptimized
              className="w-16 h-16 mx-auto mb-3 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700 shadow-xs"
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-lg font-bold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-xs"
            >
              {storeInitials}
            </div>
          )}
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {card?.store_name || 'Store'}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Feedback & Review System
          </p>
        </div>

        {/* State 4: Thank You / Resolution State */}
        {isSubmitted ? (
          <div className="py-6 space-y-4">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Terima Kasih atas Masukan Anda!
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
              Pesan Anda telah kami teruskan ke tim manajemen kami untuk evaluasi dan perbaikan lebih lanjut.
            </p>
            <div className="pt-2 text-xs text-zinc-400 dark:text-zinc-500">
              NFC Reputation Shield
            </div>
          </div>
        ) : selectedRating ? (
          /* State 3: Rating Feedback Form (1-5 Stars) */
          <div className="py-2 text-left">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                  Bagaimana pengalaman Anda?
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Rating Anda tersimpan langsung dari halaman ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRating(null);
                  setHoverRating(0);
                }}
                title="Ubah rating bintang"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
              >
                <span>★ {selectedRating}/5</span>
                <span className="text-[10px] underline font-normal text-amber-600 dark:text-amber-400">
                  Ubah
                </span>
              </button>
            </div>

            {submitError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900/50 flex items-start gap-2"
              >
                <svg
                  className="w-4 h-4 shrink-0 text-rose-600 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-semibold">{submitError}</p>
                  <p className="mt-0.5 text-[11px] text-rose-600 dark:text-rose-400">
                    Silakan coba kirim ulang atau sampaikan langsung melalui WhatsApp.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="feedback-input"
                  className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5"
                >
                  Tuliskan masukan Anda (opsional)
                </label>
                <textarea
                  id="feedback-input"
                  rows={3}
                  maxLength={2000}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Ceritakan pengalaman Anda..."
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  spellCheck={true}
                  inputMode="text"
                  className="w-full p-3 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                />
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium text-sm hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white dark:border-zinc-900 border-t-transparent rounded-full animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <span>Kirim Masukan</span>
                  )}
                </button>

                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-xs"
                  >
                    <svg
                      className="w-4 h-4 fill-current shrink-0"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92zM12.04 20.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31c-.82-1.31-1.26-2.83-1.26-4.38 0-4.54 3.7-8.24 8.24-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.54-3.7 8.24-8.24 8.24z" />
                    </svg>
                    <span>Kirim via WhatsApp</span>
                  </a>
                )}
              </div>
            </form>
          </div>
        ) : (
          /* State 1 & 2: Star Rating Component (1-5 Stars) */
          <div className="py-4 space-y-4">
            <h2 className="text-base font-medium text-zinc-700 dark:text-zinc-300">
              Bagikan pengalaman Anda (1–5 bintang)
            </h2>

            <div
              className="flex items-center justify-center gap-1 sm:gap-2 py-2"
              role="group"
              aria-label="Rating Bintang"
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || selectedRating || 0) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    role="button"
                    aria-label={`Beri rating ${star} bintang`}
                    disabled={isSubmitting}
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => !isSubmitting && setHoverRating(star)}
                    onMouseLeave={() => !isSubmitting && setHoverRating(0)}
                    className={`min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center p-1 rounded-2xl transition-transform duration-150 ${
                      isSubmitting
                        ? 'cursor-default'
                        : 'active:scale-95 hover:scale-105 cursor-pointer'
                    } focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500`}
                  >
                    <svg
                      className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors duration-150 ${
                        isFilled
                          ? 'text-[#F59E0B] fill-[#F59E0B] drop-shadow-xs'
                          : 'text-zinc-300 dark:text-zinc-700 fill-transparent hover:text-amber-300 dark:hover:text-amber-700'
                      }`}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                      />
                    </svg>
                  </button>
                );
              })}
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
