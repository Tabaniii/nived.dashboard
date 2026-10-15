'use client';

import { useState } from 'react';
import { Download, ImageIcon, Loader2, Star } from 'lucide-react';

const FORMATS = [
  { id: 'story', label: 'IG Story (9:16)', aspect: 'aspect-[9/16]', width: 'w-[220px]' },
  { id: 'post', label: 'IG Post (1:1)', aspect: 'aspect-square', width: 'w-[300px]' },
];

const dateFormatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium' });

export default function SocialProofStudio({ reviews = [], initialReviewId = '' }) {
  const [selectedId, setSelectedId] = useState(
    reviews.some((r) => String(r.id) === String(initialReviewId)) ? String(initialReviewId) : String(reviews[0]?.id || '')
  );
  const [format, setFormat] = useState('story');

  const selected = reviews.find((r) => String(r.id) === selectedId);
  const activeFormat = FORMATS.find((f) => f.id === format);
  const imageSrc = selected ? `/api/dashboard/social-card?feedback_id=${selected.id}&format=${format}` : null;

  return (
    <section id="social-proof" className="scroll-mt-24 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-5 sm:p-6 shadow-xs space-y-5">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          <ImageIcon className="size-4 text-brand-600 dark:text-brand-400" />
          Social Proof untuk Instagram
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Ubah ulasan 5★ dari pelanggan jadi gambar Story atau Post dengan logo toko. Nama dan nomor pelanggan tidak ditampilkan.
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-xs text-zinc-500">
          Belum ada ulasan 5★ yang berisi cerita. Ulasan yang ditulis pelanggan di kotak cerita 4–5★ akan muncul di sini.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <ul className="max-h-[520px] space-y-2 overflow-y-auto pr-1" aria-label="Ulasan 5 bintang">
            {reviews.map((review) => {
              const active = String(review.id) === selectedId;
              return (
                <li key={review.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedId(String(review.id))}
                    className={`w-full text-left rounded-xl border p-3 transition cursor-pointer ${
                      active
                        ? 'border-brand-500/60 bg-brand-500/10 ring-2 ring-brand-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: review.rating }, (_, i) => (
                          <Star key={i} className="size-3 fill-amber-400 text-amber-400" />
                        ))}
                      </span>
                      <span>
                        {review.cards?.store_name} · {dateFormatter.format(new Date(review.created_at))}
                      </span>
                    </span>
                    <span className="mt-1.5 block text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 line-clamp-3">
                      “{review.feedback_text}”
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="space-y-3">
            <div className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/60 p-1 text-xs">
              {FORMATS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={format === option.id}
                  onClick={() => setFormat(option.id)}
                  className={`flex-1 rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
                    format === option.id
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div
              className={`relative mx-auto overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 shadow-sm ${activeFormat.aspect} ${activeFormat.width}`}
            >
              <Loader2 className="absolute inset-0 m-auto size-5 animate-spin text-brand-500" />
              {imageSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={imageSrc} src={imageSrc} alt="Preview social proof" className="relative size-full object-cover" />
              )}
            </div>

            {imageSrc && (
              <a
                href={`${imageSrc}&download=1`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 shadow-xs"
              >
                <Download className="size-4" />
                Download PNG
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
