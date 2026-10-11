export const CARD_FIXTURES = Object.freeze({
  demo: Object.freeze({
    id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    slug: 'demo-card',
    store_name: 'Kopi Senja Utama',
    google_review_url: 'https://maps.app.goo.gl/demo-review',
    whatsapp_number: '6281234567890',
    is_shield_active: true,
  }),
  direct: Object.freeze({
    id: 'a23deb4d-4b7d-4bad-9bdd-2b0d7b3dcb6e',
    slug: 'direct-card',
    store_name: 'Warung Langsung Direct',
    google_review_url: 'https://maps.app.goo.gl/direct-review',
    whatsapp_number: '6289876543210',
    is_shield_active: false,
  }),
  noWhatsApp: Object.freeze({
    id: 'b33deb4d-5b7d-4bad-9bdd-2b0d7b3dcb6f',
    slug: 'no-wa-card',
    store_name: 'Kedai Tanpa WhatsApp',
    google_review_url: 'https://maps.app.goo.gl/no-wa-review',
    whatsapp_number: null,
    is_shield_active: true,
  }),
  longName: Object.freeze({
    id: 'c43deb4d-6b7d-4bad-9bdd-2b0d7b3dcb70',
    slug: 'long-name-card',
    store_name: 'Kopi Senja Utama dengan Nama Toko yang Sangat Panjang',
    google_review_url: 'https://maps.app.goo.gl/long-name-review',
    whatsapp_number: '6281112223333',
    is_shield_active: true,
  }),
  specialUrl: Object.freeze({
    id: 'd53deb4d-7b7d-4bad-9bdd-2b0d7b3dcb71',
    slug: 'special-url-card',
    store_name: 'Kedai URL Khusus',
    google_review_url: 'https://maps.app.goo.gl/special-review?source=qr#review',
    whatsapp_number: '6284445556666',
    is_shield_active: true,
  }),
});

export const UNKNOWN_CARD_SLUG = 'missing-card';

export const CARD_FIXTURE_IDS = Object.freeze(
  Object.values(CARD_FIXTURES).map((card) => card.id)
);
