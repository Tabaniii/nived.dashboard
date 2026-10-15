const NEGATION = '(?:tidak|tdk|gak|ga|nggak|ngga|ndak|kurang)';

const BUCKET_LABELS = Object.freeze({
  pagi: 'pagi hari',
  siang: 'jam makan siang',
  sore: 'sore hari',
  malam: 'malam hari',
  dini: 'dini hari',
});

/**
 * Keyword themes for Indonesian (and basic English) complaint text.
 * Patterns run against lowercased, diacritic-free text.
 */
export const FEEDBACK_THEMES = Object.freeze([
  {
    id: 'temperature',
    label: 'AC / suhu ruangan',
    phrase: 'AC/suhu ruangan',
    pattern: new RegExp(
      `\\b(?:ac|a/c|aircon|air ?con(?:ditioner|ditioning)?|panas|gerah|pengap|sumpek|kipas|suhu|${NEGATION} dingin|stuffy|hot)\\b`
    ),
    action: ({ tables }) =>
      `Cek dan servis AC${tables.length ? ` di area meja ${tables.join(', ')}` : ''}, pastikan suhu ruangan tetap nyaman.`,
  },
  {
    id: 'wait_time',
    label: 'Waktu tunggu',
    phrase: 'waktu tunggu pesanan',
    pattern:
      /\b(?:lama+|lambat|lelet|nunggu|menunggu|ditunggu|kelamaan|antri|antre|antrian|antrean|ngantri|ngantre|telat|slow|wait|waited|waiting|late)\b/,
    action: ({ peak }) =>
      `Tambah personel atau siapkan menu cepat${peak ? ` saat ${BUCKET_LABELS[peak]}` : ''} supaya waktu tunggu lebih singkat.`,
  },
  {
    id: 'cleanliness',
    label: 'Kebersihan',
    phrase: 'kebersihan',
    pattern:
      /\b(?:kotor|jorok|bau|sampah|lalat|kecoa|tikus|debu|berdebu|lengket|toilet|wc|kamar mandi|dirty|smell|smelly|filthy|messy|sticky)\b/,
    action: ({ tables }) =>
      `Perketat jadwal bersih-bersih meja, lantai, dan toilet${tables.length ? ` (cek meja ${tables.join(', ')})` : ''}.`,
  },
  {
    id: 'food_quality',
    label: 'Rasa & kualitas makanan',
    phrase: 'rasa/kualitas makanan',
    pattern: new RegExp(
      `\\b(?:hambar|keasinan|asin|basi|gosong|mentah|alot|pahit|kemanisan|amis|eneg|${NEGATION} (?:enak|fresh|segar|matang)|(?:makanan|minuman|kopi|nasi|mie|mi|sup|soto|teh|ayam|daging)(?:nya)?\\s+(?:\\w+\\s+)?dingin|bland|tasteless|stale|undercooked|overcooked|cold food|salty)\\b`
    ),
    action: () => 'Review standar rasa dan suhu penyajian bersama tim dapur.',
  },
  {
    id: 'staff_attitude',
    label: 'Sikap staf',
    phrase: 'sikap staf',
    pattern: new RegExp(
      `\\b(?:jutek|judes|ketus|kasar|cuek|sombong|galak|songong|${NEGATION} (?:ramah|sopan)|rude|unfriendly|impolite|arrogant)\\b`
    ),
    action: () => 'Briefing tim soal keramahan pelayanan dan apresiasi staf dengan rating terbaik.',
  },
  {
    id: 'order_accuracy',
    label: 'Pesanan salah/kurang',
    phrase: 'pesanan yang salah atau kurang',
    pattern:
      /\b(?:salah|tertukar|ketuker|ketinggalan|lupa|(?:tidak|tdk|gak|ga|nggak|ngga) sesuai|wrong|missing|forgot|forgotten)\b/,
    action: () => 'Terapkan double-check pesanan sebelum diantar ke meja.',
  },
  {
    id: 'price',
    label: 'Harga',
    phrase: 'harga',
    pattern: /\b(?:mahal|kemahalan|overpriced|expensive|pricey|harga)\b/,
    action: () => 'Komunikasikan value (porsi, promo, paket hemat) supaya harga terasa sepadan.',
  },
  {
    id: 'portion',
    label: 'Porsi',
    phrase: 'porsi',
    pattern: /\b(?:porsi|portion|kekecilan|sedikit banget|dikit banget)\b/,
    action: () => 'Evaluasi standar porsi atau tawarkan opsi porsi besar.',
  },
  {
    id: 'facility',
    label: 'Fasilitas',
    phrase: 'fasilitas (parkir, wifi, tempat duduk)',
    pattern:
      /\b(?:parkir|parkiran|wifi|wi-fi|colokan|kursi|sempit|berisik|bising|musik|mushola|musholla|parking|noisy|crowded)\b/,
    action: () => 'Cek fasilitas pendukung yang dikeluhkan (parkir, wifi, colokan, kursi).',
  },
  {
    id: 'payment',
    label: 'Kasir & pembayaran',
    phrase: 'kasir/pembayaran',
    pattern: /\b(?:kasir|bayar|pembayaran|qris|kembalian|struk|debit|edc|cashier|payment)\b/,
    action: () => 'Percepat proses kasir dan pastikan QRIS/debit selalu berfungsi.',
  },
]);

const THEME_BY_ID = new Map(FEEDBACK_THEMES.map((theme) => [theme.id, theme]));

function normalize(text) {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * @param {string|null|undefined} text
 * @returns {string[]} theme ids
 */
export function detectThemes(text) {
  if (typeof text !== 'string' || !text.trim()) return [];
  const normalized = normalize(text);
  return FEEDBACK_THEMES.filter((theme) => theme.pattern.test(normalized)).map((theme) => theme.id);
}

/**
 * Jakarta has no DST, so WIB is always UTC+7.
 * @param {string|Date} value
 * @returns {'pagi'|'siang'|'sore'|'malam'|'dini'|null}
 */
export function getTimeBucket(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const hour = (date.getUTCHours() + 7) % 24;
  if (hour >= 5 && hour <= 10) return 'pagi';
  if (hour >= 11 && hour <= 14) return 'siang';
  if (hour >= 15 && hour <= 17) return 'sore';
  if (hour >= 18) return 'malam';
  return 'dini';
}

function increment(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function topKeys(map, limit) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
    .map(([key]) => key);
}

function pickPeak(buckets, total) {
  const [top] = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  if (!top || top[1] < 2 || top[1] / total < 0.5) return null;
  return top[0];
}

function joinIndonesian(parts) {
  if (parts.length <= 1) return parts[0] || '';
  if (parts.length === 2) return `${parts[0]} dan ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, dan ${parts[parts.length - 1]}`;
}

/**
 * Deterministic weekly summary used when Gemini is unavailable.
 *
 * @param {Array<{ rating: number, feedback_text?: string|null, created_at?: string, table_code?: string|null }>} feedbacks
 */
export function buildRuleBasedSummary(feedbacks = []) {
  const feedbackCount = feedbacks.length;
  const ratings = feedbacks.map((f) => Number(f.rating)).filter((r) => r >= 1 && r <= 5);
  const avgRating = ratings.length
    ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10
    : null;
  const complaints = feedbacks.filter((f) => {
    const rating = Number(f.rating);
    return rating >= 1 && rating <= 3;
  });

  const stats = new Map();
  for (const complaint of complaints) {
    for (const id of detectThemes(complaint.feedback_text)) {
      if (!stats.has(id)) stats.set(id, { count: 0, buckets: new Map(), tables: new Map() });
      const stat = stats.get(id);
      stat.count += 1;
      increment(stat.buckets, getTimeBucket(complaint.created_at));
      increment(stat.tables, complaint.table_code);
    }
  }

  const ranked = [...stats.entries()]
    .map(([id, stat]) => ({
      id,
      stat,
      peak: pickPeak(stat.buckets, stat.count),
      tables: topKeys(stat.tables, 3),
    }))
    .sort((a, b) => b.stat.count - a.stat.count);

  const themes = ranked.map(({ id, stat, peak, tables }) => ({
    id,
    label: THEME_BY_ID.get(id).label,
    count: stat.count,
    detail: [
      peak ? `paling sering saat ${BUCKET_LABELS[peak]}` : null,
      tables.length ? `meja ${tables.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
  }));

  let summary;
  let actions;
  if (feedbackCount === 0) {
    summary = 'Belum ada masukan pelanggan dalam 7 hari terakhir.';
    actions = ['Pastikan kartu NFC dan QR mudah dijangkau pelanggan di setiap meja.'];
  } else if (complaints.length === 0) {
    summary = `Tidak ada keluhan 1–3★ minggu ini — ${feedbackCount} masukan positif masuk. Pertahankan!`;
    actions = ['Apresiasi tim atas pelayanan minggu ini dan pertahankan standar yang sama.'];
  } else if (ranked.length === 0) {
    summary = `Minggu ini ada ${complaints.length} keluhan 1–3★ dari ${feedbackCount} masukan, tapi belum terlihat pola yang jelas. Cek detailnya di kotak masukan.`;
    actions = ['Baca detail keluhan dan hubungi pelanggan yang meninggalkan nomor WhatsApp.'];
  } else {
    const parts = ranked.slice(0, 3).map(({ id, stat, peak }) => {
      const theme = THEME_BY_ID.get(id);
      return `${stat.count} soal ${theme.phrase}${peak ? ` (terutama saat ${BUCKET_LABELS[peak]})` : ''}`;
    });
    summary = `Minggu ini ada ${complaints.length} keluhan 1–3★ dari ${feedbackCount} masukan: ${joinIndonesian(parts)}.`;
    actions = ranked.slice(0, 3).map(({ id, peak, tables }) => THEME_BY_ID.get(id).action({ peak, tables }));
  }

  return {
    summary,
    themes,
    actions,
    feedbackCount,
    complaintCount: complaints.length,
    avgRating,
    source: 'rules',
  };
}
