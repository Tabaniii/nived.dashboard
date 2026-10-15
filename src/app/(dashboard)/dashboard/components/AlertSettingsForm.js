'use client';

import { useState, useTransition } from 'react';
import { BellRing, Phone, Send, Loader2, CheckCircle2, XCircle, MinusCircle, Info } from 'lucide-react';
import { sendTestAlertAction, updateAlertSettingsAction } from '../actions';
import { normalizePhoneNumber } from '@/lib/whatsapp';

const fieldClass =
  'w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all';

function handleWhatsAppInput(event) {
  const normalized = normalizePhoneNumber(event.target.value);
  if (event.target.value !== normalized) {
    event.target.value = normalized;
  }
}

function ProviderChip({ label, ready, envName }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
        ready
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
      }`}
      title={ready ? undefined : `Atur ${envName} di environment server`}
    >
      {ready ? <CheckCircle2 className="size-3" /> : <MinusCircle className="size-3" />}
      {label}: {ready ? 'siap' : `belum diatur (${envName})`}
    </span>
  );
}

function ChannelResult({ label, result }) {
  if (!result || result.skipped) {
    return (
      <li className="flex items-center gap-1.5 text-zinc-500">
        <MinusCircle className="size-3.5" />
        {label}: {result?.error || 'tidak diatur'}
      </li>
    );
  }
  return (
    <li className={`flex items-center gap-1.5 ${result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      {result.ok ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
      {label}: {result.ok ? 'terkirim' : result.error}
    </li>
  );
}

export default function AlertSettingsForm({ card, notifyStatus, needsMigration = false }) {
  const [saving, startSaving] = useTransition();
  const [testing, startTesting] = useTransition();
  const [message, setMessage] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const botUsername = notifyStatus?.telegramBotUsername;
  const fallbackNumber = normalizePhoneNumber(card.whatsapp_number || '');

  function onSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startSaving(async () => {
      const result = await updateAlertSettingsAction(formData);
      setMessage(result?.error ? { error: true, text: result.error } : { error: false, text: 'Pengaturan alert disimpan.' });
    });
  }

  function onTest() {
    setTestResult(null);
    startTesting(async () => {
      setTestResult(await sendTestAlertAction(card.id));
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-5 sm:p-6 shadow-xs space-y-4"
    >
      <input type="hidden" name="card_id" value={card.id} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <BellRing className="size-4 text-brand-600 dark:text-brand-400" />
            Alert Instan Rating 1–3★
          </h3>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            Kabari manager saat pelanggan memberi rating jelek, supaya bisa dihampiri sebelum pulang.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ProviderChip label="WhatsApp" ready={notifyStatus?.whatsapp} envName="FONNTE_TOKEN" />
          <ProviderChip label="Telegram" ready={notifyStatus?.telegram} envName="TELEGRAM_BOT_TOKEN" />
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-zinc-800 dark:text-zinc-200 cursor-pointer">
        <input
          type="checkbox"
          name="alerts_enabled"
          defaultChecked={card.alerts_enabled !== false}
          className="size-4 rounded border-zinc-300 text-brand-500 focus:ring-brand-500/30"
        />
        Kirim alert untuk kartu ini
      </label>

      <div className="space-y-1.5">
        <label htmlFor="alert_whatsapp" className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          <Phone className="size-3.5 text-zinc-400 dark:text-zinc-500" />
          WhatsApp penerima alert
        </label>
        <input
          id="alert_whatsapp"
          name="alert_whatsapp"
          inputMode="tel"
          defaultValue={card.alert_whatsapp || ''}
          onChange={handleWhatsAppInput}
          onBlur={handleWhatsAppInput}
          className={fieldClass}
          placeholder={fallbackNumber ? `Kosongkan = pakai ${fallbackNumber}` : '081234567890 → 6281234567890'}
        />
        <p className="text-[11px] text-zinc-500">
          Kosongkan untuk memakai nomor WhatsApp toko di atas. Dikirim lewat Fonnte.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="alert_telegram_chat_id" className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          <Send className="size-3.5 text-zinc-400 dark:text-zinc-500" />
          Chat ID Telegram
        </label>
        <input
          id="alert_telegram_chat_id"
          name="alert_telegram_chat_id"
          defaultValue={card.alert_telegram_chat_id || ''}
          className={fieldClass}
          placeholder="123456789 atau -1001234567890"
        />
        <div className="flex items-start gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          <Info className="size-3.5 shrink-0 mt-0.5" />
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>
              Buka {botUsername ? <strong>@{botUsername}</strong> : 'bot Telegram Nived'} di Telegram lalu tekan <strong>Start</strong>.
            </li>
            <li>
              Kirim pesan apa saja ke <strong>@userinfobot</strong> untuk melihat Chat ID Anda (berupa angka).
            </li>
            <li>Untuk grup: tambahkan bot ke grup, lalu pakai ID grup (diawali -100).</li>
          </ol>
        </div>
      </div>

      <div className="pt-1 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving || needsMigration}
          className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-xs"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          <span>{saving ? 'Menyimpan...' : 'Simpan Alert'}</span>
        </button>
        <button
          type="button"
          onClick={onTest}
          disabled={testing || needsMigration}
          className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {testing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          <span>Kirim Tes</span>
        </button>

        {message && (
          <div
            role="alert"
            className={`rounded-xl px-3.5 py-2 text-xs font-medium border ${
              message.error
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300'
                : 'border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {testResult && (
        <div role="status" className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-xs space-y-1.5">
          <p className={`font-semibold ${testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {testResult.success ? 'Pesan tes terkirim.' : testResult.error}
          </p>
          {testResult.results && (
            <ul className="space-y-1">
              <ChannelResult label="WhatsApp" result={testResult.results.whatsapp} />
              <ChannelResult label="Telegram" result={testResult.results.telegram} />
            </ul>
          )}
        </div>
      )}

      <p className="text-[11px] text-zinc-500">Simpan dulu sebelum menekan Kirim Tes.</p>
    </form>
  );
}
