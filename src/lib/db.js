import { supabase, isSupabaseConfigured } from './supabase';

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

/**
 * Fetch a single card by its unique slug.
 *
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
export async function getCardBySlug(slug) {
  if (!slug || typeof slug !== 'string') return null;

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
 * @returns {Promise<Object|null>}
 */
export async function createTapLog({
  card_id,
  device_os,
  user_agent,
  ip_hash = null,
  selected_stars = null,
}) {
  const row = {
    card_id,
    device_os,
    user_agent,
    ip_hash,
    selected_stars,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('tap_logs')
        .insert([row])
        .select()
        .single();

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
 * @returns {Promise<Object|null>}
 */
export async function recordStarTelemetry({
  card_id,
  selected_stars,
  ip_hash = null,
  device_os = 'Other',
  user_agent = '',
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
  });
}

/**
 * Record internal customer feedback for ratings 1-3.
 *
 * @param {Object} entry
 * @param {string} entry.card_id
 * @param {number} entry.rating
 * @param {string} [entry.feedback_text]
 * @param {string} [entry.customer_whatsapp]
 * @returns {Promise<Object|null>}
 */
export async function createFeedback({
  card_id,
  rating,
  feedback_text = '',
  customer_whatsapp = null,
}) {
  const row = {
    card_id,
    rating,
    feedback_text: feedback_text || null,
    customer_whatsapp: customer_whatsapp || null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('internal_feedbacks')
        .insert([row])
        .select()
        .single();

      if (error) {
        console.error('[db] Error creating internal feedback:', error.message);
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
