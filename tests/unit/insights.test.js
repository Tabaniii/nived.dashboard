import { describe, it, expect } from 'vitest';
import { detectThemes, getTimeBucket, buildRuleBasedSummary } from '@/lib/insights/themes';
import { parseGeminiSummary } from '@/lib/insights/gemini';
import { generateFeedbackSummary } from '@/lib/insights/summary';

// 05:30Z = 12:30 WIB (lunch), 12:00Z = 19:00 WIB (evening)
const LUNCH = '2026-10-12T05:30:00.000Z';
const EVENING = '2026-10-13T12:00:00.000Z';

const weekOfFeedback = [
  { rating: 2, feedback_text: 'AC lantai 2 kurang dingin', created_at: EVENING, table_code: '12' },
  { rating: 3, feedback_text: 'Ruangan panas, gerah banget', created_at: EVENING, table_code: '12' },
  { rating: 2, feedback_text: 'AC mati di lantai atas', created_at: LUNCH, table_code: '14' },
  { rating: 1, feedback_text: 'Pengap dan AC tidak dingin', created_at: EVENING, table_code: '12' },
  { rating: 2, feedback_text: 'Pesanan lama banget datangnya', created_at: LUNCH },
  { rating: 3, feedback_text: 'Nunggu 40 menit baru datang', created_at: LUNCH },
  { rating: 2, feedback_text: 'Pelayanan lambat', created_at: LUNCH },
  { rating: 5, feedback_text: 'Kopinya enak!', created_at: LUNCH },
  { rating: 4, feedback_text: '', created_at: EVENING },
];

describe('detectThemes', () => {
  it('maps AC complaints to temperature without confusing them with cold food', () => {
    expect(detectThemes('AC lantai 2 kurang dingin')).toEqual(['temperature']);
  });

  it('detects cold food as a food quality issue', () => {
    expect(detectThemes('Makanannya sudah dingin pas sampai')).toContain('food_quality');
    expect(detectThemes('Makanannya sudah dingin pas sampai')).not.toContain('temperature');
  });

  it('does not match "ac" inside other words', () => {
    expect(detectThemes('pacar saya suka acaranya')).toEqual([]);
  });

  it('detects multiple themes in one complaint, including English text', () => {
    expect(detectThemes('Slow service and the table was dirty')).toEqual(
      expect.arrayContaining(['wait_time', 'cleanliness'])
    );
  });

  it('returns no themes for empty input', () => {
    expect(detectThemes('')).toEqual([]);
    expect(detectThemes(null)).toEqual([]);
  });
});

describe('getTimeBucket', () => {
  it('buckets timestamps by Jakarta (WIB) local time', () => {
    expect(getTimeBucket(LUNCH)).toBe('siang');
    expect(getTimeBucket(EVENING)).toBe('malam');
    expect(getTimeBucket('2026-10-12T01:00:00.000Z')).toBe('pagi');
  });
});

describe('buildRuleBasedSummary', () => {
  it('summarizes the top complaint themes with counts and peak time', () => {
    const result = buildRuleBasedSummary(weekOfFeedback);

    expect(result.source).toBe('rules');
    expect(result.feedbackCount).toBe(9);
    expect(result.complaintCount).toBe(7);
    expect(result.themes[0]).toMatchObject({ id: 'temperature', count: 4 });
    expect(result.themes[1]).toMatchObject({ id: 'wait_time', count: 3 });
    expect(result.themes[1].detail).toContain('jam makan siang');
    expect(result.themes[0].detail).toContain('12');
    expect(result.summary).toContain('4 soal AC');
    expect(result.summary).toContain('3 soal waktu tunggu');
    expect(result.actions.length).toBeGreaterThanOrEqual(2);
  });

  it('reports a quiet week when there is no feedback', () => {
    const result = buildRuleBasedSummary([]);
    expect(result.feedbackCount).toBe(0);
    expect(result.themes).toEqual([]);
    expect(result.summary).toContain('Belum ada masukan');
  });

  it('celebrates a week without complaints', () => {
    const result = buildRuleBasedSummary([{ rating: 5, feedback_text: 'Mantap', created_at: LUNCH }]);
    expect(result.complaintCount).toBe(0);
    expect(result.summary).toContain('Tidak ada keluhan');
  });
});

describe('parseGeminiSummary', () => {
  const wrap = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] });

  it('parses the JSON payload and clamps the arrays', () => {
    const parsed = parseGeminiSummary(
      wrap(
        JSON.stringify({
          summary: 'Minggu ini ada 4 catatan soal AC.',
          themes: [{ label: 'AC', count: 4, detail: 'Meja 12' }],
          actions: ['Servis AC', 'Tambah staf siang'],
        })
      )
    );
    expect(parsed).toEqual({
      summary: 'Minggu ini ada 4 catatan soal AC.',
      themes: [{ label: 'AC', count: 4, detail: 'Meja 12' }],
      actions: ['Servis AC', 'Tambah staf siang'],
    });
  });

  it('tolerates fenced JSON', () => {
    const parsed = parseGeminiSummary(
      wrap('```json\n{"summary":"Oke","themes":[],"actions":[]}\n```')
    );
    expect(parsed.summary).toBe('Oke');
  });

  it('throws on empty or invalid responses', () => {
    expect(() => parseGeminiSummary({})).toThrow();
    expect(() => parseGeminiSummary(wrap('{"themes":[]}'))).toThrow();
  });
});

describe('generateFeedbackSummary', () => {
  it('uses the keyword fallback when no Gemini key is configured', async () => {
    const result = await generateFeedbackSummary(weekOfFeedback, { env: {} });
    expect(result.source).toBe('rules');
  });

  it('calls Gemini with the API key header and returns an AI summary', async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      summary: 'Minggu ini ada 4 catatan soal AC lantai dua.',
                      themes: [{ label: 'AC kurang dingin', count: 4, detail: 'Meja 12' }],
                      actions: ['Servis AC lantai dua'],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 }
      );
    };

    const result = await generateFeedbackSummary(weekOfFeedback, {
      env: { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-flash-latest' },
      fetchImpl,
    });

    expect(result.source).toBe('ai');
    expect(result.summary).toBe('Minggu ini ada 4 catatan soal AC lantai dua.');
    expect(result.complaintCount).toBe(7);
    expect(calls[0].url).toContain('models/gemini-flash-latest:generateContent');
    expect(calls[0].init.headers['x-goog-api-key']).toBe('test-key');
    expect(calls[0].init.body).toContain('AC lantai 2 kurang dingin');
  });

  it('falls back to keywords when Gemini fails', async () => {
    const result = await generateFeedbackSummary(weekOfFeedback, {
      env: { GEMINI_API_KEY: 'test-key' },
      fetchImpl: async () => new Response('{"error":{"message":"quota"}}', { status: 429 }),
    });
    expect(result.source).toBe('rules');
    expect(result.themes[0].id).toBe('temperature');
  });

  it('skips Gemini entirely when there is no written feedback', async () => {
    let called = false;
    const result = await generateFeedbackSummary([{ rating: 5, feedback_text: '' }], {
      env: { GEMINI_API_KEY: 'test-key' },
      fetchImpl: async () => {
        called = true;
        return new Response('{}');
      },
    });
    expect(called).toBe(false);
    expect(result.source).toBe('rules');
  });
});
