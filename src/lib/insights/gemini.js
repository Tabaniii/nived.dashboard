export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_FEEDBACK_LINES = 150;
const MAX_TEXT_LENGTH = 300;

const SYSTEM_PROMPT = [
  'Kamu analis pengalaman pelanggan untuk usaha F&B dan retail di Indonesia.',
  'Ringkas masukan pelanggan seminggu terakhir menjadi insight yang singkat, faktual, dan bisa langsung ditindaklanjuti pemilik usaha.',
  'Jangan mengarang data: angka harus berasal dari daftar masukan.',
  'Gunakan bahasa Indonesia yang santai tapi profesional.',
].join(' ');

const SUMMARY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    themes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          count: { type: 'INTEGER' },
          detail: { type: 'STRING' },
        },
        required: ['label', 'count'],
      },
    },
    actions: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['summary', 'themes', 'actions'],
};

const lineFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function formatLine(feedback) {
  const date = new Date(feedback.created_at);
  const when = Number.isNaN(date.getTime()) ? '-' : lineFormatter.format(date);
  const meta = [
    when,
    `${feedback.rating}★`,
    feedback.table_code ? `meja ${feedback.table_code}` : null,
    feedback.staff_code ? `staf ${feedback.staff_code}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
  const text = feedback.feedback_text.trim().replace(/\s+/g, ' ').slice(0, MAX_TEXT_LENGTH);
  return `- [${meta}] ${text}`;
}

/**
 * @param {Array<Object>} feedbacks
 * @param {{ storeNames?: string[], feedbackCount?: number, complaintCount?: number, avgRating?: number|null, ruleThemes?: Array<{ label: string, count: number }> }} [context]
 */
export function buildSummaryPrompt(feedbacks, context = {}) {
  const written = feedbacks
    .filter((f) => typeof f.feedback_text === 'string' && f.feedback_text.trim())
    .slice(0, MAX_FEEDBACK_LINES);

  const hints = (context.ruleThemes || [])
    .map((theme) => `${theme.label}: ${theme.count}`)
    .join(', ');

  return [
    context.storeNames?.length ? `Toko: ${context.storeNames.join(', ')}` : null,
    `Statistik 7 hari: ${context.feedbackCount ?? feedbacks.length} masukan, ${context.complaintCount ?? 0} keluhan (1–3★), rata-rata rating ${context.avgRating ?? '-'}.`,
    hints ? `Hitungan kata kunci otomatis (bisa kurang akurat): ${hints}.` : null,
    '',
    'Daftar masukan tertulis (format: [hari jam WIB | rating | meja | staf] teks):',
    ...written.map(formatLine),
    '',
    'Tugas:',
    '1. summary: 1–2 kalimat tren keluhan minggu ini, sebutkan angka dan waktu/lokasi bila ada pola. Contoh gaya: "Minggu ini ada 4 catatan soal AC lantai dua kurang dingin dan 3 komplain soal waktu tunggu pesanan saat jam makan siang."',
    '2. themes: maksimal 5 tema keluhan utama, urut dari yang paling sering. count = jumlah masukan yang membahas tema itu. detail = konteks singkat (waktu, meja, staf) bila ada.',
    '3. actions: 2–4 saran tindakan konkret untuk minggu depan.',
    'Jika tidak ada keluhan, beri ringkasan positif singkat dan saran untuk mempertahankan kualitas.',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

/**
 * @param {Object} json Gemini generateContent response
 * @returns {{ summary: string, themes: Array<{ label: string, count: number, detail: string }>, actions: string[] }}
 */
export function parseGeminiSummary(json) {
  const text = (json?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || '')
    .join('')
    .trim();
  if (!text) throw new Error('Respons Gemini kosong');

  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned);

  const summary = typeof parsed?.summary === 'string' ? parsed.summary.trim() : '';
  if (!summary) throw new Error('Ringkasan Gemini tidak valid');

  const themes = (Array.isArray(parsed.themes) ? parsed.themes : [])
    .filter((theme) => typeof theme?.label === 'string' && theme.label.trim())
    .slice(0, 5)
    .map((theme) => ({
      label: theme.label.trim().slice(0, 80),
      count: Math.max(0, Math.round(Number(theme.count) || 0)),
      detail: typeof theme.detail === 'string' ? theme.detail.trim().slice(0, 160) : '',
    }));

  const actions = (Array.isArray(parsed.actions) ? parsed.actions : [])
    .filter((action) => typeof action === 'string' && action.trim())
    .slice(0, 4)
    .map((action) => action.trim().slice(0, 200));

  return { summary: summary.slice(0, 600), themes, actions };
}

/**
 * Summarize a week of feedback with the Gemini API (structured JSON output).
 */
export async function summarizeWithGemini(
  feedbacks,
  { apiKey, model = DEFAULT_GEMINI_MODEL, fetchImpl = fetch, timeoutMs = 25_000, context = {} }
) {
  const modelId = model.replace(/^models\//, '');
  const response = await fetchImpl(`${GEMINI_API_BASE}/${modelId}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: buildSummaryPrompt(feedbacks, context) }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: SUMMARY_SCHEMA,
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new Error(json?.error?.message || `Gemini HTTP ${response.status}`);
  }

  return parseGeminiSummary(json);
}
