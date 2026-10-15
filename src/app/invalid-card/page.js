import { Suspense } from 'react';
import Link from 'next/link';
import { getBaseUrl } from '@/lib/url';

export const instant = false;

export const metadata = {
  title: 'Card Not Registered — Nived NFC',
  description: 'The requested NFC review card is not registered, inactive, or currently unavailable.',
  robots: { index: false, follow: false },
};

async function SlugInfo({ searchParams }) {
  const params = await searchParams;
  const slug = params?.slug ? String(params.slug) : '';
  if (!slug) return null;

  return (
    <div className="mt-6 rounded-xl border border-stone-200/80 bg-stone-50/90 p-3 text-left">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        Requested Card Slug
      </div>
      <div className="mt-0.5 break-all font-mono text-xs font-semibold text-brand-900">
        {slug}
      </div>
    </div>
  );
}

export default function InvalidCardPage({ searchParams }) {
  const brandUrl = getBaseUrl();

  return (
    <main className="flex min-h-svh w-full flex-1 items-center justify-center bg-radial from-stone-50 via-[#f4f6f2] to-[#e8ece5] px-4 py-8 text-stone-900 sm:py-12">
      <section
        aria-labelledby="card-not-found-title"
        className="relative w-full max-w-md overflow-hidden rounded-[2.25rem] border border-stone-200/90 bg-white/95 p-7 text-center shadow-[0_20px_60px_-25px_rgba(20,50,30,0.18)] backdrop-blur-md sm:p-9"
      >
        {/* Soft top gradient accent */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 left-1/2 h-24 w-48 -translate-x-1/2 rounded-full bg-linear-to-b from-amber-200/40 via-amber-100/20 to-transparent blur-xl"
        />

        {/* 404 Icon Badge */}
        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-xs ring-4 ring-amber-100/60 sm:h-20 sm:w-20 sm:rounded-3xl">
          <svg
            className="h-8 w-8 sm:h-10 sm:w-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-800">
          404 · Not Registered
        </span>

        <h1
          id="card-not-found-title"
          className="mt-3 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl"
        >
          Card Not Registered
        </h1>

        <p className="mt-3 text-sm leading-6 text-stone-600">
          This NFC card or link is not registered or is currently inactive.
          Please ask a staff member for assistance to leave your review.
        </p>

        <Suspense fallback={null}>
          <SlugInfo searchParams={searchParams} />
        </Suspense>

        <div className="mt-7 flex flex-col gap-2.5">
          <Link
            href={brandUrl}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition"
          >
            Visit Nived Studio
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-stone-100 text-xs text-stone-400">
          Need help? Contact the business owner or counter staff directly.
        </div>
      </section>
    </main>
  );
}
