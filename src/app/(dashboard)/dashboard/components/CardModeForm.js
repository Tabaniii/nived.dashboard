'use client';

import { useState, useTransition } from 'react';
import { Star, Megaphone, ExternalLink, Clock, Loader2, RotateCcw, Eye, Store } from 'lucide-react';
import CardSwitcher from './CardSwitcher';
import { updateCardModeAction } from '../actions';
import { cardPublicUrl } from '@/lib/slug';
import { computeModeUntil, isModeExpired, resolveActiveCardMode } from '@/lib/card-mode';

const fieldClass =
  'w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all';

const labelClass = 'text-xs font-medium text-zinc-700 dark:text-zinc-300';

const MODES = [
  {
    id: 'review',
    icon: Star,
    title: 'Review',
    description: 'Pelanggan memberi rating. 4–5★ diarahkan ke Google, 1–3★ masuk kotak masukan.',
  },
  {
    id: 'promo',
    icon: Megaphone,
    title: 'Promo',
    description: 'Tampilkan promo atau menu spesial dulu. Tombol "Rate your visit" tetap ada.',
  },
  {
    id: 'redirect',
    icon: ExternalLink,
    title: 'Redirect',
    description: 'Langsung buka link lain: menu digital, Instagram, katalog WhatsApp, dll.',
  },
];

const MODE_LABELS = { review: 'Review', promo: 'Promo', redirect: 'Redirect' };

const DURATIONS = [
  { id: 'none', label: 'Tanpa batas' },
  { id: 'today', label: 'Sampai 23:59 hari ini' },
  { id: '3h', label: '3 jam' },
  { id: '24h', label: '24 jam' },
  { id: '7d', label: '7 hari' },
  { id: 'custom', label: 'Pilih tanggal' },
];

const untilFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatUntil(value) {
  return `${untilFormatter.format(new Date(value))} WIB`;
}

function ModeStatus({ card }) {
  const savedMode = card.card_mode || 'review';
  const activeMode = resolveActiveCardMode(card);

  let text;
  let tone = 'brand';
  if (activeMode !== 'review') {
    text = `Mode ${MODE_LABELS[activeMode]} aktif${card.mode_until ? ` sampai ${formatUntil(card.mode_until)}` : ' tanpa batas waktu'}.`;
    tone = 'amber';
  } else if (savedMode !== 'review' && isModeExpired(card)) {
    text = `Mode ${MODE_LABELS[savedMode]} sudah berakhir (${formatUntil(card.mode_until)}). Kartu otomatis kembali ke Review.`;
  } else if (savedMode !== 'review') {
    text = `Konten mode ${MODE_LABELS[savedMode]} belum lengkap, jadi kartu tetap membuka halaman Review.`;
  } else {
    text = 'Kartu sedang di Mode Review.';
  }

  return (
    <div
      className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
        tone === 'amber'
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          : 'border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300'
      }`}
    >
      {text}
    </div>
  );
}

function ModeEditor({ card, disabled }) {
  const keepUntil = card.mode_until && !isModeExpired(card) ? card.mode_until : null;
  const durations = keepUntil
    ? [{ id: 'keep', label: `Tetap sampai ${formatUntil(keepUntil)}` }, ...DURATIONS]
    : DURATIONS;

  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState(card.card_mode || 'review');
  const [durationChoice, setDuration] = useState(keepUntil ? 'keep' : 'none');
  const duration = durationChoice === 'keep' && !keepUntil ? 'none' : durationChoice;
  const [customUntil, setCustomUntil] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [values, setValues] = useState({
    promo_title: card.promo_title || '',
    promo_message: card.promo_message || '',
    promo_image_url: card.promo_image_url || '',
    promo_cta_label: card.promo_cta_label || '',
    promo_url: card.promo_url || '',
  });

  const publicUrl = cardPublicUrl(card.slug);
  const activeMode = resolveActiveCardMode(card);
  const bind = (key) => ({
    value: values[key],
    onChange: (event) => setValues((current) => ({ ...current, [key]: event.target.value })),
  });

  function save(nextMode, modeUntil) {
    const formData = new FormData();
    formData.set('card_id', card.id);
    formData.set('card_mode', nextMode);
    formData.set('mode_until', modeUntil || '');
    for (const [key, value] of Object.entries(values)) formData.set(key, value);

    setFeedback(null);
    startTransition(async () => {
      const result = await updateCardModeAction(formData);
      if (result?.error) {
        setFeedback({ error: true, text: result.error });
        return;
      }
      setFeedback({
        error: false,
        text:
          nextMode === 'review'
            ? 'Kartu kembali ke Mode Review.'
            : `Mode ${MODE_LABELS[nextMode]} aktif. Link NFC & QR tetap sama.`,
      });
    });
  }

  function onSubmit(event) {
    event.preventDefault();
    if (mode !== 'review' && duration === 'custom' && !computeModeUntil('custom', customUntil)) {
      setFeedback({ error: true, text: 'Pilih tanggal & jam berakhir dulu.' });
      return;
    }
    const modeUntil = duration === 'keep' ? keepUntil : computeModeUntil(duration, customUntil);
    save(mode, mode === 'review' ? null : modeUntil);
  }

  function backToReview() {
    setMode('review');
    save('review', null);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-5 sm:p-6 shadow-xs space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <Store className="size-4 text-brand-600 dark:text-brand-400" />
          <span>{card.store_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs"
          >
            <Eye className="size-3.5" />
            <span>Lihat kartu</span>
          </a>
          {activeMode !== 'review' && (
            <button
              type="button"
              onClick={backToReview}
              disabled={pending || disabled}
              className="flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs cursor-pointer disabled:opacity-60"
            >
              <RotateCcw className="size-3.5" />
              <span>Kembali ke Review</span>
            </button>
          )}
        </div>
      </div>

      <ModeStatus card={card} />

      <div role="radiogroup" aria-label="Mode kartu" className="grid gap-3 sm:grid-cols-3">
        {MODES.map(({ id, icon: Icon, title, description }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            onClick={() => setMode(id)}
            className={`text-left rounded-xl border p-3.5 transition cursor-pointer ${
              mode === id
                ? 'border-brand-500/60 bg-brand-500/10 ring-2 ring-brand-500/20'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <Icon className="size-4 text-brand-600 dark:text-brand-400" />
              {title}
            </span>
            <span className="mt-1 block text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              {description}
            </span>
          </button>
        ))}
      </div>

      {mode === 'promo' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="promo_title" className={labelClass}>
              Judul promo <span className="text-rose-500">*</span>
            </label>
            <input id="promo_title" maxLength={120} required className={fieldClass} placeholder="Diskon 20% Kopi Susu" {...bind('promo_title')} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="promo_message" className={labelClass}>Detail promo</label>
            <textarea
              id="promo_message"
              rows={3}
              maxLength={1000}
              className={fieldClass}
              placeholder="Berlaku setiap hari jam 14.00–17.00. Tunjukkan layar ini ke kasir."
              {...bind('promo_message')}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="promo_cta_label" className={labelClass}>Teks tombol</label>
              <input id="promo_cta_label" maxLength={60} className={fieldClass} placeholder="Lihat Menu" {...bind('promo_cta_label')} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="promo_url" className={labelClass}>Link tombol</label>
              <input id="promo_url" type="url" className={fieldClass} placeholder="https://instagram.com/tokoanda" {...bind('promo_url')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="promo_image_url" className={labelClass}>Link gambar promo</label>
            <input
              id="promo_image_url"
              type="url"
              className={fieldClass}
              placeholder="https://…/promo.jpg"
              {...bind('promo_image_url')}
            />
            <p className="text-[11px] text-zinc-500">Opsional. Harus link langsung ke file gambar (JPG/PNG/WebP).</p>
          </div>
        </div>
      )}

      {mode === 'redirect' && (
        <div className="space-y-1.5">
          <label htmlFor="redirect_url" className={labelClass}>
            Link tujuan <span className="text-rose-500">*</span>
          </label>
          <input
            id="redirect_url"
            type="url"
            required
            className={fieldClass}
            placeholder="https://wa.me/c/628123456789"
            {...bind('promo_url')}
          />
          <p className="text-[11px] text-zinc-500">
            Pelanggan yang tap kartu langsung dibuka ke link ini. Rating tidak ditanyakan selama mode ini aktif.
          </p>
        </div>
      )}

      {mode !== 'review' && (
        <div className="space-y-2">
          <span className={`${labelClass} flex items-center gap-1.5`}>
            <Clock className="size-3.5 text-zinc-400" />
            Berlaku sampai
          </span>
          <div className="flex flex-wrap gap-2">
            {durations.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={duration === option.id}
                onClick={() => setDuration(option.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  duration === option.id
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-700 dark:text-brand-300'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {duration === 'custom' && (
            <input
              type="datetime-local"
              aria-label="Tanggal dan jam berakhir"
              value={customUntil}
              onChange={(event) => setCustomUntil(event.target.value)}
              className={`${fieldClass} max-w-xs`}
            />
          )}
          <p className="text-[11px] text-zinc-500">Setelah waktu habis, kartu otomatis kembali ke Mode Review.</p>
        </div>
      )}

      <div className="pt-1 flex flex-wrap items-center justify-between gap-4">
        <button
          type="submit"
          disabled={pending || disabled}
          className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-xs active:scale-[0.99]"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <span>Terapkan Mode {MODE_LABELS[mode]}</span>
          )}
        </button>

        {feedback && (
          <div
            role="alert"
            className={`rounded-xl px-3.5 py-2 text-xs font-medium border ${
              feedback.error
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300'
                : 'border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300'
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>
    </form>
  );
}

export default function CardModeForm({ cards = [], needsMigration = false }) {
  const [selectedId, setSelectedId] = useState(cards[0]?.id || '');
  const selected = cards.find((c) => c.id === selectedId) || cards[0];

  if (!selected) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-8 text-center max-w-xl shadow-xs">
        <Store className="size-10 text-zinc-400 dark:text-zinc-600 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Belum Ada Kartu NFC Terdaftar</h3>
        <p className="mt-1 text-xs text-zinc-500">Hubungi tim Nived untuk menerbitkan kartu NFC toko Anda.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <CardSwitcher cards={cards} selectedId={selected.id} onSelect={setSelectedId} />
      <ModeEditor key={selected.id} card={selected} disabled={needsMigration} />
    </div>
  );
}
