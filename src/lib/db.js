import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isMissingSchemaError } from '@/lib/db-errors';

/**
 * In-memory fallback store when Supabase environment variables are not set
 * or during standalone unit testing.
 */
const initialMockCards = [
  {
    id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    slug: 'demo-card',
    store_name: 'Kopi Senja Utama',
    google_review_url: 'https://maps.app.goo.gl/demo-review',
    whatsapp_number: '6281234567890',
    is_shield_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'a23deb4d-4b7d-4bad-9bdd-2b0d7b3dcb6e',
    slug: 'direct-card',
    store_name: 'Warung Langsung Direct',
    google_review_url: 'https://maps.app.goo.gl/direct-review',
    whatsapp_number: '6289876543210',
    is_shield_active: false,
    created_at: new Date().toISOString(),
  },
];

let mockCards = [...initialMockCards];
let mockTapLogs = [];
let mockFeedbacks = [];

function attributionColumns({ staff_code, table_code }) {
  return {
    ...(staff_code ? { staff_code } : {}),
    ...(table_code ? { table_code } : {}),
  };
}

/**
 * Insert a row; if the staff/table columns are not migrated yet, retry without
 * them so taps and feedback are never lost.
 */
async function insertWithAttributionFallback(table, row) {
  const result = await supabase.from(table).insert([row]).select().single();
  const hasAttribution = 'staff_code' in row || 'table_code' in row;

  if (result.error && hasAttribution && isMissingSchemaError(result.error)) {
    console.warn(`[db] ${table} has no staff/table columns yet; run the growth_features migration.`);
    const { staff_code: _staff, table_code: _table, ...rest } = row;
    return supabase.from(table).insert([rest]).select().single();
  }

  return result;
}

/**
 * Fetch a single card by its unique slug.
 *
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
export async function getCardBySlug(slug) {
  if (typeof slug !== 'string' || !slug.trim() || slug.length > 100) return null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('slug', slug)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error('[db] Error fetching card by slug:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[db] Supabase connection error in getCardBySlug:', err);
      return null;
    }
  }

  // Fallback to in-memory store
  const found = mockCards.find((c) => c.slug === slug && !c.deleted_at);
  return found ? { ...found } : null;
}

/**
 * Fetch a single card by its UUID.
 *
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getCardById(id) {
  if (!id || typeof id !== 'string') return null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error('[db] Error fetching card by id:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[db] Supabase connection error in getCardById:', err);
      return null;
    }
  }

  // Fallback to in-memory store
  const found = mockCards.find((c) => c.id === id && !c.deleted_at);
  return found ? { ...found } : null;
}

/**
 * Insert a tap log entry into the database.
 *
 * @param {Object} entry
 * @param {string} entry.card_id
 * @param {string} entry.device_os
 * @param {string} entry.user_agent
 * @param {string} [entry.ip_hash]
 * @param {number} [entry.selected_stars]
 * @param {string|null} [entry.staff_code]
 * @param {string|null} [entry.table_code]
 * @returns {Promise<Object|null>}
 */
export async function createTapLog({
  card_id,
  device_os,
  user_agent,
  ip_hash = null,
  selected_stars = null,
  staff_code = null,
  table_code = null,
}) {
  const row = {
    card_id,
    device_os,
    user_agent,
    ip_hash,
    selected_stars,
    ...attributionColumns({ staff_code, table_code }),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await insertWithAttributionFallback('tap_logs', row);

      if (error) {
        console.error('[db] Error creating tap log:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[db] Supabase connection error in createTapLog:', err);
      return null;
    }
  }

  // Fallback to in-memory store
  const inserted = { id: mockTapLogs.length + 1, ...row };
  mockTapLogs.push(inserted);
  return inserted;
}

/**
 * Record or update star telemetry for a card interaction.
 *
 * @param {Object} params
 * @param {string} params.card_id
 * @param {number} params.selected_stars
 * @param {string} [params.ip_hash]
 * @param {string} [params.device_os='Other']
 * @param {string} [params.user_agent='']
 * @param {string|null} [params.staff_code] used only when a new tap log is created
 * @param {string|null} [params.table_code] used only when a new tap log is created
 * @returns {Promise<Object|null>}
 */
export async function recordStarTelemetry({
  card_id,
  selected_stars,
  ip_hash = null,
  device_os = 'Other',
  user_agent = '',
  staff_code = null,
  table_code = null,
}) {
  if (isSupabaseConfigured && supabase) {
    try {
      // Find most recent tap log for this card within the last 15 minutes to update
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      let query = supabase
        .from('tap_logs')
        .select('id')
        .eq('card_id', card_id)
        .gte('created_at', fifteenMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      if (ip_hash) {
        query = query.eq('ip_hash', ip_hash);
      }

      const { data: existingRows } = await query;

      if (existingRows && existingRows.length > 0) {
        const { data: updated } = await supabase
          .from('tap_logs')
          .update({ selected_stars })
          .eq('id', existingRows[0].id)
          .select()
          .single();
        return updated;
      }

      // If no recent log, insert a new one
      return await createTapLog({
        card_id,
        device_os,
        user_agent,
        ip_hash,
        selected_stars,
        staff_code,
        table_code,
      });
    } catch (err) {
      console.error('[db] Supabase connection error in recordStarTelemetry:', err);
      return null;
    }
  }

  // In-memory fallback
  // Find matching recent entry in memory
  const recentIndex = mockTapLogs.findLastIndex(
    (log) => log.card_id === card_id && (!ip_hash || log.ip_hash === ip_hash)
  );

  if (recentIndex !== -1) {
    mockTapLogs[recentIndex].selected_stars = selected_stars;
    return mockTapLogs[recentIndex];
  }

  return await createTapLog({
    card_id,
    device_os,
    user_agent,
    ip_hash,
    selected_stars,
    staff_code,
    table_code,
  });
}

/**
 * Record customer feedback for all ratings (1-5), linked to the business via cards.
 *
 * @param {Object} entry
 * @param {string} entry.card_id
 * @param {number} entry.rating
 * @param {string} [entry.feedback_text]
 * @param {string} [entry.customer_whatsapp]
 * @param {string|null} [entry.staff_code]
 * @param {string|null} [entry.table_code]
 * @returns {Promise<Object|null>}
 */
export async function createFeedback({
  card_id,
  rating,
  feedback_text = '',
  customer_whatsapp = null,
  staff_code = null,
  table_code = null,
}) {
  const row = {
    card_id,
    rating,
    feedback_text: feedback_text || null,
    customer_whatsapp: customer_whatsapp || null,
    ...attributionColumns({ staff_code, table_code }),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await insertWithAttributionFallback('internal_feedbacks', row);

      if (error) {
        console.error('[db] Error creating internal feedback:', error.message);

        // If remote database still enforces legacy 1-3 constraint (error 23514) on 4-5 star ratings:
        if (error.code === '23514' && rating >= 4) {
          console.warn('[db] Remote internal_feedbacks table enforces 1-3 check; recording 4-5 star rating in tap_logs.');
          await recordStarTelemetry({ card_id, selected_stars: rating }).catch(() => {});
          const fallback = { id: `fb-${Date.now()}`, ...row };
          mockFeedbacks.push(fallback);
          return fallback;
        }

        return null;
      }
      return data;
    } catch (err) {
      console.error('[db] Supabase connection error in createFeedback:', err);
      return null;
    }
  }

  // Fallback to in-memory store
  const inserted = { id: mockFeedbacks.length + 1, ...row };
  mockFeedbacks.push(inserted);
  return inserted;
}

/**
 * Stamp a feedback row once its low-rating alert was delivered.
 *
 * @param {number|string} id
 * @returns {Promise<boolean>}
 */
export async function markFeedbackAlertSent(id) {
  if (id == null) return false;
  const sentAt = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('internal_feedbacks')
      .update({ alert_sent_at: sentAt })
      .eq('id', id);

    if (error) {
      console.warn('[db] Could not mark feedback alert as sent:', error.message);
      return false;
    }
    return true;
  }

  const row = mockFeedbacks.find((f) => f.id === id);
  if (row) row.alert_sent_at = sentAt;
  return Boolean(row);
}

/**
 * Test helpers for inspecting and resetting mock storage.
 */
export function getMockStore() {
  return {
    cards: [...mockCards],
    tapLogs: [...mockTapLogs],
    feedbacks: [...mockFeedbacks],
  };
}

export function resetMockStore() {
  mockCards = [...initialMockCards];
  mockTapLogs = [];
  mockFeedbacks = [];
}

export function seedMockCard(card) {
  mockCards.push(card);
}
