'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getStoreInitials } from '@/lib/store-initials';

const validUntilFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function formatValidUntil(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${validUntilFormatter.format(date)} WIB`;
}

/**
 * Smart Mode "promo" landing page shown on the same NFC link.
 *
 * @param {{
 *   card: {
 *     store_name: string,
 *     logo_url?: string|null,
 *     promo_title?: string|null,
 *     promo_message?: string|null,
 *     promo_image_url?: string|null,
 *     promo_cta_label?: string|null,
 *     promo_url?: string|null,
 *     mode_until?: string|null,
 *   },
 *   reviewHref: string,
 * }} props
 */
export default function PromoView({ card, reviewHref }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const storeName = card?.store_name || 'Our Business';
  const validUntil = formatValidUntil(card?.mode_until);

  return (
    <main className="flex min-h-svh w-full flex-1 flex-col items-center justify-center bg-radial from-stone-50 via-[#f4f6f2] to-[#e8ece5] px-4 py-8 text-stone-900 sm:py-12">
      <div className="mb-5 flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-50/90 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-amber-800">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        Special for You
      </div>

      <article className="relative w-full max-w-md overflow-hidden rounded-[2.25rem] border border-stone-200/90 bg-white/95 shadow-[0_20px_70px_-25px_rgba(20,50,30,0.18)] backdrop-blur-md">
        <header className="flex items-center gap-3 border-b border-stone-100 bg-linear-to-b from-brand-50/50 to-white px-6 py-5">
          {card?.logo_url && !logoFailed ? (
            <Image
              src={card.logo_url}
              alt={`Logo ${storeName}`}
              width={48}
              height={48}
              unoptimized
              onError={() => setLogoFailed(true)}
              className="h-12 w-12 rounded-xl border-2 border-white bg-white object-cover shadow-sm ring-1 ring-stone-200/70"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-brand-900 to-brand-950 text-base font-bold text-white shadow-md"
            >
              {getStoreInitials(storeName)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-stone-900">{storeName}</p>
            <p className="text-xs text-stone-500">Thank you for visiting us!</p>
          </div>
        </header>

        {card?.promo_image_url && !imageFailed ? (
          <Image
            src={card.promo_image_url}
            alt={card.promo_title || `Promo ${storeName}`}
            width={800}
            height={600}
            unoptimized
            onError={() => setImageFailed(true)}
            className="h-auto max-h-80 w-full object-cover"
          />
        ) : null}

        <section className="px-6 py-7 text-center sm:px-8">
          {card?.promo_title ? (
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">{card.promo_title}</h1>
          ) : null}
          {card?.promo_message ? (
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-600">
              {card.promo_message}
            </p>
          ) : null}
          {validUntil ? (
            <p className="mt-3 text-[11px] font-medium text-stone-400">Valid until {validUntil}</p>
          ) : null}

          <div className="mt-7 space-y-2.5">
            {card?.promo_url ? (
              <a
                href={card.promo_url}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-brand-950/20 transition hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
              >
                {card.promo_cta_label || 'See Details'}
              </a>
            ) : null}
            <a
              href={reviewHref}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-amber-400" aria-hidden="true">
                <path d="m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96L12 2.5Z" />
              </svg>
              Rate your visit
            </a>
          </div>
        </section>
      </article>

      <footer className="mt-6 text-center text-xs text-stone-400">
        Powered by Filter-Rating NFC
      </footer>
    </main>
  );
}
