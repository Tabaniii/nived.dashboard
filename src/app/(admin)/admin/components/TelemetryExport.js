'use client';

import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Check } from 'lucide-react';

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => escape(r[k])).join(','))].join(
    '\n'
  );
}

/**
 * Sanitize for LLM fine-tune export — no raw IP, keep ip_hash only.
 */
function sanitizeTaps(taps) {
  return (taps || []).map((t) => ({
    id: t.id,
    card_slug: t.cards?.slug || null,
    store_name: t.cards?.store_name || null,
    device_os: t.device_os,
    user_agent: t.user_agent,
    selected_stars: t.selected_stars,
    ip_hash: t.ip_hash,
    created_at: t.created_at,
  }));
}

function sanitizeFeedbacks(feedbacks) {
  return (feedbacks || []).map((f) => ({
    id: f.id,
    card_slug: f.cards?.slug || null,
    store_name: f.cards?.store_name || null,
    rating: f.rating,
    feedback_text: f.feedback_text,
    customer_whatsapp: f.customer_whatsapp,
    created_at: f.created_at,
  }));
}

export default function TelemetryExport({ taps = [], feedbacks = [] }) {
  const [downloading, setDownloading] = useState(null);

  const tapRows = sanitizeTaps(taps);
  const feedbackRows = sanitizeFeedbacks(feedbacks);

  const handleExportJson = () => {
    setDownloading('json');
    downloadBlob(
      `nived-telemetry-dataset-${Date.now()}.json`,
      JSON.stringify({ taps: tapRows, feedbacks: feedbackRows }, null, 2),
      'application/json'
    );
    setTimeout(() => setDownloading(null), 1500);
  };

  const handleExportTapsCsv = () => {
    setDownloading('taps-csv');
    downloadBlob(
      `nived-taps-${Date.now()}.csv`,
      toCsv(tapRows),
      'text/csv;charset=utf-8'
    );
    setTimeout(() => setDownloading(null), 1500);
  };

  const handleExportFeedbacksCsv = () => {
    setDownloading('feedbacks-csv');
    downloadBlob(
      `nived-feedbacks-${Date.now()}.csv`,
      toCsv(feedbackRows),
      'text/csv;charset=utf-8'
    );
    setTimeout(() => setDownloading(null), 1500);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleExportJson}
        className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 hover:text-white cursor-pointer shadow-xs"
      >
        {downloading === 'json' ? (
          <Check className="size-3.5 text-emerald-400" />
        ) : (
          <FileJson className="size-3.5 text-emerald-400" />
        )}
        <span>Export JSON (Dataset)</span>
      </button>

      <button
        type="button"
        onClick={handleExportTapsCsv}
        className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 hover:text-white cursor-pointer shadow-xs"
      >
        {downloading === 'taps-csv' ? (
          <Check className="size-3.5 text-emerald-400" />
        ) : (
          <FileSpreadsheet className="size-3.5 text-sky-400" />
        )}
        <span>Export Taps CSV</span>
      </button>

      <button
        type="button"
        onClick={handleExportFeedbacksCsv}
        className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 hover:text-white cursor-pointer shadow-xs"
      >
        {downloading === 'feedbacks-csv' ? (
          <Check className="size-3.5 text-emerald-400" />
        ) : (
          <FileSpreadsheet className="size-3.5 text-amber-400" />
        )}
        <span>Export Feedback CSV</span>
      </button>
    </div>
  );
}
